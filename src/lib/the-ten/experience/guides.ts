import type { GuideDefinition, GuideKey } from './types'
import type { Locale } from '@/lib/i18n'

export const guides: GuideDefinition[] = [
  {
    key: 'ibn-sina', name: 'Ibn Sina', title: 'The Integrator', philosophy: 'See the whole before judging the part.',
    lens: 'Synthesis · Prioritization · Pattern Integration',
    ability: { name: 'SYNTHESIZE', description: 'Organize what is known before committing to what it means.', prompts: ['Who is the patient?', 'What changed?', 'What defines the current problem?', 'What cannot be ignored?'] },
    confirmation: 'I will not give you answers. I will help you see what belongs together.',
  },
  {
    key: 'al-razi', name: 'Al-Razi', title: 'The Empiricist', philosophy: 'Do not protect your first conclusion. Test it.',
    lens: 'Evidence · Updating · Bias Awareness',
    ability: { name: 'CHALLENGE', description: 'Expose the assumption hiding inside your current reasoning.', prompts: ['What assumption are you making?', 'Which currently revealed evidence supports it?', 'What would make you reconsider?'] },
    confirmation: 'Expect me to question you precisely when you feel most certain.',
  },
  {
    key: 'jabir', name: 'Jabir ibn Hayyan', title: 'The Experimentalist', philosophy: 'A hypothesis becomes useful when it can be tested.',
    lens: 'Hypothesis · Probability · Investigation',
    ability: { name: 'TEST', description: 'Compare what would support, weaken or distinguish your hypothesis.', prompts: ['What is your hypothesis?', 'What supports it?', 'What opposes it?', 'What finding or test would change your mind?'] },
    confirmation: 'Bring me hypotheses. We will see whether they survive.',
  },
  {
    key: 'hippocrates', name: 'Hippocrates', title: 'The Explorer', philosophy: 'Before the disease, there is the patient.',
    lens: 'Observation · Safety · Reassessment',
    ability: { name: 'OBSERVE', description: 'Reframe the problem through the patient’s immediate context and priorities.', prompts: ['What needs attention now?', 'What could harm the patient first?', 'What has changed?', 'What needs reassessment?'] },
    confirmation: 'When the problem grows complicated, return first to the patient.',
  },
]

export const guidesArabic: GuideDefinition[] = [
  { ...guides[0], name: 'ابن سينا', title: 'المُكامل', philosophy: 'انظر إلى الكل قبل أن تحكم على الجزء.', lens: 'التوليف · ترتيب الأولويات · تكامل الأنماط', ability: { name: 'وَحِّد', description: 'نظّم ما هو معلوم قبل أن تلتزم بتفسيره.', prompts: ['من هو المريض؟', 'ما الذي تغيّر؟', 'ما الذي يحدّد المشكلة الحالية؟', 'ما الذي لا يمكن تجاهله؟'] }, confirmation: 'لن أعطيك الإجابات، بل سأساعدك على رؤية ما ينبغي أن يجتمع.' },
  { ...guides[1], name: 'الرازي', title: 'التجريبي', philosophy: 'لا تحمِ استنتاجك الأول؛ اختبره.', lens: 'الدليل · تحديث التقدير · الوعي بالانحياز', ability: { name: 'تَحَدَّ', description: 'اكشف الافتراض المختبئ داخل استدلالك الحالي.', prompts: ['ما الافتراض الذي تبنيه؟', 'أي دليل مكشوف حالياً يدعمه؟', 'ما الذي سيدفعك إلى إعادة النظر؟'] }, confirmation: 'توقّع أن أسائلك بدقة حين تبلغ ذروة يقينك.' },
  { ...guides[2], name: 'جابر بن حيّان', title: 'صاحب التجربة', philosophy: 'تصبح الفرضية نافعة حين يمكن اختبارها.', lens: 'الفرضية · الاحتمال · الاستقصاء', ability: { name: 'اِخْتَبِر', description: 'قارن ما يدعم فرضيتك أو يضعفها أو يميّزها.', prompts: ['ما فرضيتك؟', 'ما الذي يدعمها؟', 'ما الذي يعارضها؟', 'أي نتيجة أو فحص سيغيّر رأيك؟'] }, confirmation: 'ائتني بالفرضيات، ولنرَ إن كانت ستصمد.' },
  { ...guides[3], name: 'أبقراط', title: 'المستكشف', philosophy: 'قبل المرض، يوجد المريض.', lens: 'الملاحظة · السلامة · إعادة التقييم', ability: { name: 'لَاحِظ', description: 'أعد صياغة المشكلة من خلال سياق المريض الفوري وأولوياته.', prompts: ['ما الذي يحتاج إلى اهتمام الآن؟', 'ما الذي قد يؤذي المريض أولاً؟', 'ما الذي تغيّر؟', 'ما الذي يحتاج إلى إعادة تقييم؟'] }, confirmation: 'حين تتعقّد المشكلة، عُد أولاً إلى المريض.' },
]

export function getGuides(locale: Locale) {
  return locale === 'ar' ? guidesArabic : guides
}

/** Usage is recorded once per run for First Activation; the workspace never affects marks or progression. */
export const guideAbilityPolicy = {
  recordedInvocationsPerMission: 1,
  affectsProgression: false,
  persistsWorkspaceText: false,
} as const

export function getGuide(key: GuideKey | null | undefined, locale: Locale = 'en') {
  return getGuides(locale).find(guide => guide.key === key) ?? null
}

export function guideKeyFromName(name: string | null | undefined): GuideKey | null {
  if (!name) return null
  const normalized = name.toLocaleLowerCase().replaceAll(/[^a-z]/g, '')
  return guides.find(guide => guide.name.toLocaleLowerCase().replaceAll(/[^a-z]/g, '') === normalized)?.key ?? null
}
