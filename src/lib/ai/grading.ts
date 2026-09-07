import 'server-only'

export type RubricCriterionInput = {
  code: string
  title: string
  description: string | null
  scoringGuidance: string | null
  maxScore: number
}

export type AIGradingInput = {
  questionStem: string
  learnerResponse: string
  rubricInstructions: string | null
  referenceAnswer: string | null
  criteria: RubricCriterionInput[]
}

export type AIGradingCriterionResult = {
  criterion_code: string
  score: number
  rationale: string
  confidence: number
  missing_concepts: string[]
  errors: string[]
}

export type AIGradingResult = {
  provider: 'openai'
  model: string
  promptVersion: string
  providerResponseId: string | null
  totalScore: number
  confidence: number
  summary: string
  uncertainty: string
  criteria: AIGradingCriterionResult[]
  inputTokens: number | null
  outputTokens: number | null
  rawOutput: unknown
}

const DEFAULT_MODEL = 'gpt-5.6-luna'
const DEFAULT_PROMPT_VERSION = 'written_rubric_v1'

export function aiGradingConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function aiGradingModel() {
  return process.env.SEIP_AI_GRADING_MODEL?.trim() || DEFAULT_MODEL
}

export async function gradeWrittenResponse(input: AIGradingInput): Promise<AIGradingResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('AI grading is not configured. Set OPENAI_API_KEY on the server.')

  if (!input.learnerResponse.trim()) throw new Error('Cannot grade an empty written response.')
  if (!input.criteria.length) throw new Error('The rubric has no criteria.')

  const model = aiGradingModel()
  const promptVersion = process.env.SEIP_AI_PROMPT_VERSION?.trim() || DEFAULT_PROMPT_VERSION
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      total_score: { type: 'number' },
      confidence: { type: 'number' },
      summary: { type: 'string' },
      uncertainty: { type: 'string' },
      criteria: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            criterion_code: { type: 'string', enum: input.criteria.map((criterion) => criterion.code) },
            score: { type: 'number' },
            rationale: { type: 'string' },
            confidence: { type: 'number' },
            missing_concepts: { type: 'array', items: { type: 'string' } },
            errors: { type: 'array', items: { type: 'string' } },
          },
          required: ['criterion_code', 'score', 'rationale', 'confidence', 'missing_concepts', 'errors'],
        },
      },
    },
    required: ['total_score', 'confidence', 'summary', 'uncertainty', 'criteria'],
  }

  const prompt = [
    'You are an assessment assistant in a medical-education program.',
    'Your output is an advisory proposed score only. A qualified human reviewer makes the final grading decision.',
    'Use only the supplied rubric, question, reference answer (if supplied), and learner response.',
    'Do not infer credit for concepts the learner did not express. Do not introduce criteria that are absent from the rubric.',
    'Apply every criterion independently. Never exceed a criterion maximum. The total must equal the sum of criterion scores.',
    'Identify material factual or clinical errors explicitly. If evidence is ambiguous, lower confidence and explain the uncertainty.',
    'Confidence is a self-reported model confidence signal, not a calibrated probability.',
    '',
    `QUESTION:\n${input.questionStem}`,
    '',
    `RUBRIC INSTRUCTIONS:\n${input.rubricInstructions || 'No additional instructions.'}`,
    '',
    `REFERENCE ANSWER:\n${input.referenceAnswer || 'No reference answer supplied. Grade only from the rubric criteria.'}`,
    '',
    'RUBRIC CRITERIA:',
    ...input.criteria.map((criterion) => [
      `${criterion.code} — ${criterion.title} (max ${criterion.maxScore})`,
      criterion.description ? `Description: ${criterion.description}` : '',
      criterion.scoringGuidance ? `Scoring guidance: ${criterion.scoringGuidance}` : '',
    ].filter(Boolean).join('\n')),
    '',
    `LEARNER RESPONSE:\n${input.learnerResponse}`,
  ].join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
      reasoning: { effort: 'low' },
      temperature: 0,
      store: false,
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema',
          name: 'seip_written_grading',
          strict: true,
          schema,
        },
      },
    }),
    cache: 'no-store',
  })

  const raw = await response.json() as Record<string, unknown>
  if (!response.ok) {
    const message = extractApiError(raw) || `OpenAI request failed with HTTP ${response.status}`
    throw new Error(message)
  }

  const outputText = extractOutputText(raw)
  if (!outputText) throw new Error('AI provider returned no structured grading output.')

  let parsed: {
    total_score: number
    confidence: number
    summary: string
    uncertainty: string
    criteria: AIGradingCriterionResult[]
  }
  try {
    parsed = JSON.parse(outputText)
  } catch {
    throw new Error('AI provider returned invalid JSON.')
  }

  validateResult(parsed, input.criteria)

  const usage = (raw.usage ?? null) as { input_tokens?: number; output_tokens?: number } | null
  return {
    provider: 'openai',
    model,
    promptVersion,
    providerResponseId: typeof raw.id === 'string' ? raw.id : null,
    totalScore: parsed.total_score,
    confidence: parsed.confidence,
    summary: parsed.summary,
    uncertainty: parsed.uncertainty,
    criteria: parsed.criteria,
    inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : null,
    outputTokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : null,
    rawOutput: parsed,
  }
}

function validateResult(
  result: { total_score: number; confidence: number; criteria: AIGradingCriterionResult[] },
  criteria: RubricCriterionInput[],
) {
  const criterionMap = new Map(criteria.map((criterion) => [criterion.code, criterion]))
  if (result.criteria.length !== criteria.length) throw new Error('AI output did not score every rubric criterion exactly once.')

  const seen = new Set<string>()
  let sum = 0
  for (const score of result.criteria) {
    const criterion = criterionMap.get(score.criterion_code)
    if (!criterion || seen.has(score.criterion_code)) throw new Error('AI output contains an invalid or duplicated rubric criterion.')
    seen.add(score.criterion_code)
    if (!Number.isFinite(score.score) || score.score < 0 || score.score > criterion.maxScore) {
      throw new Error(`AI score for ${score.criterion_code} is outside the rubric range.`)
    }
    if (!Number.isFinite(score.confidence) || score.confidence < 0 || score.confidence > 1) throw new Error('AI confidence is outside 0–1.')
    sum += score.score
  }

  if (Math.abs(sum - result.total_score) > 0.001) throw new Error('AI total score does not equal the sum of criterion scores.')
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) throw new Error('AI overall confidence is outside 0–1.')
}

function extractOutputText(raw: Record<string, unknown>) {
  if (typeof raw.output_text === 'string') return raw.output_text
  const output = Array.isArray(raw.output) ? raw.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const typed = part as { type?: string; text?: string }
      if (typed.type === 'output_text' && typeof typed.text === 'string') return typed.text
    }
  }
  return null
}

function extractApiError(raw: Record<string, unknown>) {
  const error = raw.error
  if (!error || typeof error !== 'object') return null
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : null
}
