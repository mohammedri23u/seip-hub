# THE TEN — BAGHDAD NEXUS Research Outputs

Updated: 2026-09-09
Status: research-output framework for First Activation

## Principle

THE TEN should generate analyzable educational evidence without turning the learner experience into a surveillance dashboard or overstating what a short intervention can prove.

Clinical reasoning is context- and content-dependent, so no single score should be interpreted as competence. The research layer therefore triangulates:
- matched Entry/Exit assessment results
- objective-level Reasoning Signals
- live mission initial answer / revote / confidence telemetry
- transfer responses
- Nexus Echo delayed retrieval
- learner feedback
- human rubric scoring of constructed responses
- optional AI grading proposals, when intentionally configured

This is aligned with recent programmatic-assessment literature emphasizing longitudinality, multiple methods, triangulation, feedback, and learner agency in clinical-reasoning assessment.

## Priority research outputs

### 1. First Activation pre/post clinical-reasoning signal study

**Question**  
Does learner performance change from the Entry checkpoint to the matched Exit Transfer Check after completing M01–M04?

**Primary outcomes**
- total Entry vs Exit percentage
- objective-level Entry vs Exit performance for TEN-LO-01 through TEN-LO-10

**Secondary outcomes**
- selected-response vs constructed-response change
- proportion of learners showing positive, neutral, or negative change by objective

**Preferred analysis**
- paired descriptive analysis first
- paired t-test only if distributional assumptions are reasonable; otherwise Wilcoxon signed-rank
- report effect size and confidence interval, not p-value alone
- display individual paired trajectories where sample size permits

**Claims boundary**  
Without a control/comparator and adequate design, improvement is an observed pre/post association and must not be presented as proof that THE TEN caused durable clinical competence.

### 2. Peer Instruction and reasoning revision study

**Question**  
How often do learners revise an answer after peer discussion, and how does confidence change between initial commit and revote?

**Available telemetry**
- initial response
- initial confidence
- revote response
- revote confidence
- changed-answer indicator
- mission/stage

**Key outputs**
- answer-change rate by mission/stage
- mean/median confidence shift
- correct→correct, incorrect→correct, correct→incorrect and incorrect→incorrect transitions when a revealed key exists
- subgroup exploration by baseline Reasoning Signal only when sample size and governance are adequate

**Interpretation**  
Answer change is a reasoning-process signal, not a reward metric. THE TEN intentionally does not penalize changed answers.

### 3. Selected-response vs constructed-response reasoning study

**Question**  
Do learners who perform well on canonical SBA items show the same pattern on generated written reasoning?

**Data**
- 12 canonical SBA items
- 4 rubric-scored constructed-response items
- shared Learning Objective map

**Key outputs**
- SBA score vs written-rubric score correlation
- objective-level discordance profiles
- cases where recognition is stronger than generated reasoning, and vice versa

**Value**  
This can test whether adding constructed responses yields meaningfully different formative information rather than merely duplicating the MCQ signal.

### 4. Human rubric reliability study

**Question**  
How consistently do human reviewers apply the four analytic rubrics?

**Design**
- double-score a prespecified sample of written responses independently
- blind reviewer 2 to reviewer 1 when feasible
- report criterion-level and total-score agreement

**Outputs**
- ICC or weighted agreement statistic appropriate to the scoring scale
- absolute score differences
- criterion-specific disagreement patterns
- moderation frequency

**Use**  
This should precede strong claims about written-score precision.

### 5. AI-assisted grading validation study

Run only if AI grading is intentionally enabled and ethics/data-governance requirements are satisfied.

**Question**  
How closely do AI rubric proposals agree with independent human reviewers in this local assessment context?

**Required safeguards**
- AI remains advisory only
- human reviewer scores independently before seeing the AI proposal
- final grade remains human/moderation governed
- validate locally before operational reliance

**Outputs**
- AI–human absolute score difference
- criterion-level agreement
- over-scoring / under-scoring direction
- moderation trigger rate
- error analysis by rubric and response quality
- optional time-saved estimate

Recent medical-education studies show promising but variable agreement across questions, models and disciplines, supporting this human-governed design rather than autonomous grading.

### 6. Confidence-calibration study

**Question**  
Does confidence track performance more appropriately over the program and after feedback/discussion?

**Data sources**
- canonical confidence-calibration assessment item
- mission-stage confidence ratings
- initial/revote confidence
- correctness where a stage has a defined answer

**Outputs**
- confidence–accuracy relationship
- overconfidence / underconfidence profiles
- confidence change after peer discussion
- calibration by mission

**Boundary**  
Confidence is never used as a grade multiplier.

### 7. Nexus Echo retrieval / retention study

**Question**  
What proportion of learners successfully retrieve the transferable reasoning principle at the delayed Echo checkpoint?

**Data**
- mission completion timestamp
- Echo unlock interval
- first retrieval response
- answer-anchor access only after response

**Outputs**
- completion rate
- retrieval performance by mission
- association with original mission performance / confidence

The current 60-hour unlock is the canonical First Activation timing and sits within the program's 48–72 hour retrieval target; it should not be claimed as a universally optimal interval.

### 8. Feasibility and learner-experience study

**Question**  
Is THE TEN feasible and acceptable as a mobile-first clinical-reasoning learning experience?

**Operational outcomes**
- mission completion rate
- assessment completion rate
- attendance / participation
- incomplete response patterns
- facilitator progression failures or support incidents

**Learner-reported outcomes**
- relevance rating
- learning-design rating
- most valuable component
- improvement suggestions

## Analytics implementation

The program-level `Reasoning Signals` view is backed by the server-authoritative `ten_program_analytics` RPC.

It currently provides only aggregate program-management data:
- active learner count
- Entry / Exit result counts and mean percentages
- objective-level Entry / Exit means and descriptive deltas
- M01–M04 participant / completion counts
- initial and revote confidence means
- answer-change rate after discussion
- learner-feedback summaries
- research-consent status counts

The page intentionally does **not** provide a one-click identifiable research export. Program evaluation and research are related but not interchangeable; research datasets should be generated only under the applicable ethics, consent and data-minimization process.

## Recommended study hierarchy

For the competition / first cohort, prioritize:
1. feasibility + learner experience
2. paired Entry/Exit Reasoning Signals
3. peer-instruction answer change and confidence calibration
4. selected-response vs constructed-response signal comparison

After adequate sample size and reviewer calibration:
5. human rubric reliability
6. AI–human grading agreement
7. Nexus Echo retention

## Minimum reporting rules

- report sample size for every outcome
- distinguish missing data from zero performance
- report effect sizes and confidence intervals where appropriate
- avoid treating multiple objective percentages as independent proof of competence
- prespecify primary outcomes before inferential analysis where possible
- preserve the distinction between program evaluation and human-subject research
- never include declined/withdrawn learners in a research dataset when consent is required
- do not use public leaderboards or punitive rank outcomes

## Evidence anchors reviewed for this framework

- Torre D, Daniel M, Ratcliffe T, et al. **Programmatic Assessment of Clinical Reasoning: New Opportunities to Meet an Ongoing Challenge.** Teaching and Learning in Medicine. 2025;37(3):403-411. DOI: 10.1080/10401334.2024.2333921. PMID: 38794865.
- Guth TA, et al. **Assessment of Clinical Reasoning in Undergraduate Medical Education: A Pragmatic Approach to Programmatic Assessment.** Academic Medicine. 2024;99(8):912-919. PMID: 38412485.
- Staal J, et al. **Impact of performance and information feedback on medical interns' confidence–accuracy calibration.** Advances in Health Sciences Education. 2024;29:129-145. DOI: 10.1007/s10459-023-10252-9.
- Bolgova O, et al. **Evaluating large language models as graders of medical short answer questions: a comparative analysis with expert human graders.** Medical Education Online. 2025. PMID: 40849930.
- Seneviratne HMTW, Manathunga SS. **Artificial intelligence assisted automated short answer question scoring tool shows high correlation with human examiner markings.** BMC Medical Education. 2025;25:1146.

## Claims boundary

First Activation can support claims such as:
- THE TEN implements a structured, multi-method clinical-reasoning learning and assessment system
- objective-level reasoning signals can be tracked longitudinally within the program
- peer-discussion and confidence telemetry can make parts of the reasoning process observable
- written reasoning uses explicit analytic rubrics with human-governed grading

It should not claim, without future validation, that:
- THE TEN independently establishes clinical competence
- one cohort proves causal superiority over conventional teaching
- AI grading is equivalent to expert human grading in this setting
- a short-term score change proves durable patient-care performance
