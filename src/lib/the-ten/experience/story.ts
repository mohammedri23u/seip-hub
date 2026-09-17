import type { MissionEpisodeInput, StoryDefinition, StoryScene } from './types'
import type { Locale } from '@/lib/i18n'

export const arrivalStory: StoryDefinition = {
  id: 'arrival', title: 'The Arrival', version: 1,
  scenes: [
    { id: 'quiet', eyebrow: 'THE TEN — BAGHDAD NEXUS', title: 'Every connection has a beginning.', narration: 'A chronicle of observation, judgment and the paths between them.', visualKey: 'quiet', layout: 'center', motion: 'still', atmosphere: 'quiet', ctaLabel: 'Open the chronicle', allowPrevious: false },
    { id: 'city', eyebrow: 'BAGHDAD · 391 AH · 1001 CE', title: 'A city gathered around knowledge.', narration: 'Along the river, questions travelled from one mind to another.', visualKey: 'city', layout: 'left', motion: 'drift', atmosphere: 'city', ctaLabel: 'Look beyond the familiar' },
    { id: 'arrival', eyebrow: 'BAGHDAD · 391 AH · 1001 CE', title: 'Not the Baghdad history remembers.', narration: 'Beneath what was written, another system endured unseen.', visualKey: 'baghdad', layout: 'left', motion: 'drift', atmosphere: 'city', ctaLabel: 'Follow the hidden path', allowPrevious: false },
    { id: 'nexus', eyebrow: 'BENEATH THE CITY', title: 'The Nexus.', narration: 'It was never built to preserve facts. It preserved the paths between observation, evidence, hypothesis, decision and reassessment.', visualKey: 'nexus', layout: 'left', motion: 'focus', atmosphere: 'nexus', ctaLabel: 'Enter the chamber' },
    { id: 'ten', eyebrow: 'THE TEN', title: 'Ten Signals kept those paths alive.', narration: 'Together they allowed knowledge to become judgment.', visualKey: 'signals', layout: 'center', motion: 'focus', atmosphere: 'nexus', emphasis: '● ● ● ● ● ● ● ● ● ●', ctaLabel: 'Listen' },
    { id: 'fracture', eyebrow: 'THE FRACTURE', title: 'Knowledge remained. Connection did not.', narration: 'Pathways separated. Information fragmented. Evidence became certainty before it was questioned. Tests became answers before they became questions.', visualKey: 'dark', layout: 'center', motion: 'fracture', atmosphere: 'fracture', emphasis: '○ ○ ○ ○ ○ ○ ○ ○ ○ ○', ctaLabel: 'Find what remains' },
    { id: 'guardians', eyebrow: 'THE GUARDIANS', title: 'Four answered when the Nexus called.', narration: 'Each understood a different path of reasoning. None could restore the system alone.', visualKey: 'guardians', layout: 'center', motion: 'focus', atmosphere: 'quiet', ctaLabel: 'Approach' },
    { id: 'seeker', eyebrow: 'SEEKER IDENTIFIED', title: 'It found you.', speaker: 'The Chronicler', narration: 'The Nexus did not search for another master. It searched for a mind still becoming one — a mind with knowledge whose way of deciding is still being formed.', visualKey: 'seeker', layout: 'left', motion: 'focus', atmosphere: 'nexus', ctaLabel: 'Answer the call' },
    { id: 'invitation', eyebrow: 'FIRST ACTIVATION', title: 'Four Signals can still be reached.', narration: 'Restore them, and the Nexus may awaken again.', visualKey: 'signals', layout: 'center', motion: 'activate', atmosphere: 'gold', emphasis: '◌ ◌ ◌ ◌ ○ ○ ○ ○ ○ ○', ctaLabel: 'Enter the Nexus' },
  ],
}

export const arrivalStoryArabic: StoryDefinition = {
  ...arrivalStory,
  title: 'الوصول',
  scenes: [
    { ...arrivalStory.scenes[0], title: 'لكل رابط بداية.', narration: 'سِجلٌّ للملاحظة والحُكم والمسارات التي تصل بينهما.', ctaLabel: 'افتح السِجلّ' },
    { ...arrivalStory.scenes[1], eyebrow: 'بغداد · 391 هـ · 1001 م', title: 'مدينةٌ اجتمعت حول المعرفة.', narration: 'على امتداد النهر، انتقلت الأسئلة من عقلٍ إلى آخر.', ctaLabel: 'انظر إلى ما وراء المألوف' },
    { ...arrivalStory.scenes[2], eyebrow: 'بغداد · 391 هـ · 1001 م', title: 'ليست بغداد التي يذكرها التاريخ.', narration: 'تحت ما دُوّن، ظلّ نظامٌ آخر قائماً بعيداً عن الأنظار.', ctaLabel: 'اتبع المسار الخفي' },
    { ...arrivalStory.scenes[3], eyebrow: 'تحت المدينة', title: 'النِكسس.', narration: 'لم يُبنَ لحفظ الحقائق، بل لحفظ المسارات بين الملاحظة والدليل والفرضية والقرار وإعادة التقييم.', ctaLabel: 'ادخل الحجرة' },
    { ...arrivalStory.scenes[4], title: 'أبقت عشر إشارات تلك المسارات حيّة.', narration: 'وباجتماعها تحوّلت المعرفة إلى حُكم.', ctaLabel: 'أنصت' },
    { ...arrivalStory.scenes[5], eyebrow: 'التصدّع', title: 'بقيت المعرفة، وانقطع الرابط.', narration: 'انفصلت المسارات وتجزأت المعلومات. صار الدليل يقيناً قبل مساءلته، وصارت الفحوص إجابات قبل أن تصبح أسئلة.', ctaLabel: 'اعثر على ما تبقّى' },
    { ...arrivalStory.scenes[6], eyebrow: 'الحُرّاس', title: 'استجاب أربعة حين نادى النِكسس.', narration: 'فهم كل واحدٍ منهم مساراً مختلفاً من الاستدلال، ولم يكن في وسع أيٍّ منهم استعادة النظام بمفرده.', ctaLabel: 'اقترب' },
    { ...arrivalStory.scenes[7], eyebrow: 'تم التعرّف إلى الباحث', title: 'لقد وجدك.', speaker: 'المؤرّخ', narration: 'لم يبحث النِكسس عن أستاذٍ آخر؛ بل عن عقلٍ ما زال يتكوّن، عقلٍ يمتلك المعرفة ولا تزال طريقته في اتخاذ القرار قيد البناء.', ctaLabel: 'أجب النداء' },
    { ...arrivalStory.scenes[8], eyebrow: 'التفعيل الأول', title: 'ما زال الوصول إلى أربع إشارات ممكناً.', narration: 'أعِد تفعيلها، وقد يستيقظ النِكسس من جديد.', ctaLabel: 'ادخل النِكسس' },
  ],
}

export function getArrivalStory(locale: Locale) {
  return locale === 'ar' ? arrivalStoryArabic : arrivalStory
}

export const arrivalBeats = arrivalStory.scenes.map(scene => ({ id: scene.id, eyebrow: scene.eyebrow, title: scene.title, body: scene.narration ?? scene.dialogue ?? '', visual: scene.visualKey, emphasis: scene.emphasis }))

export function createMissionPrelude(input: MissionEpisodeInput, locale: Locale = 'en'): StoryDefinition {
  const guardian = input.guardian
  const ar = locale === 'ar'
  const scenes: StoryScene[] = [
    { id: 'signal-detected', eyebrow: `${input.missionId} · ${ar ? 'تم رصد إشارة' : 'SIGNAL DETECTED'}`, title: input.title, narration: input.focus || (ar ? 'بلغ اضطرابٌ النِكسس، ولن يتضح معناه إلا حين يكشف الميسّر عن المهمة.' : 'A disturbance has reached the Nexus. Its meaning will emerge only as the facilitator releases the mission.'), visualKey: 'baghdad', layout: 'left', motion: 'drift', atmosphere: 'city', ctaLabel: ar ? 'تتبّع الإشارة' : 'Trace the signal', allowPrevious: false },
    { id: 'reasoning-lens', eyebrow: `${input.mentor.toUpperCase()} · ${ar ? 'عدسة الاستدلال' : 'REASONING LENS'}`, title: input.lens, narration: ar ? 'احمل هذه الطريقة في التفكير إلى المهمة. إنها عدسة، وليست إجابة.' : 'Carry this way of thinking into the mission. It is a lens, not an answer.', visualKey: 'nexus', character: guardian ?? undefined, characterReaction: 'guide', layout: guardian ? 'portrait' : 'center', motion: 'focus', atmosphere: 'nexus', ctaLabel: ar ? 'استعد للاستدلال' : 'Prepare to reason' },
    { id: 'world-quiets', eyebrow: ar ? 'الاستدلال المباشر' : 'LIVE REASONING', title: ar ? 'يهدأ العالم.' : 'The world quiets.', narration: ar ? 'من هنا، لا يكشف الدليل السريري التالي إلا الميسّر. التزم بإجابتك على انفراد، وناقش علناً، ولا تعدّل رأيك إلا حين يغيّر الدليل استدلالك.' : 'From here, only the facilitator can reveal the next clinical clue. Commit privately. Discuss openly. Revise only when the evidence changes your reasoning.', visualKey: 'dark', layout: 'center', motion: 'still', atmosphere: 'quiet', ctaLabel: ar ? 'ادخل غرفة الانتظار' : 'Enter the waiting room' },
  ]
  return { id: `mission:${input.runId}:prelude`, title: `${input.title} prelude`, version: 1, replayable: true, scenes }
}

export function createMissionEpilogue(input: MissionEpisodeInput, locale: Locale = 'en'): StoryDefinition {
  const ar = locale === 'ar'
  return { id: `mission:${input.runId}:epilogue`, title: `${input.title} epilogue`, version: 1, replayable: true, scenes: [
    { id: 'consequence', eyebrow: ar ? 'المسار ثابت' : 'THE PATH HOLDS', title: ar ? 'تمت استعادة رابط.' : 'A connection has been restored.', narration: ar ? 'ليس لأن كل قرار كان سهلاً، بل لأن الدليل والحُكم وإعادة التقييم ظلّت مترابطة.' : 'Not because every decision was effortless, but because evidence, judgment and reassessment remained connected.', visualKey: 'nexus', nexusLevel: input.nexusLevel, character: input.guide ?? undefined, characterReaction: 'guide', layout: input.guide ? 'portrait' : 'center', motion: 'focus', atmosphere: 'nexus', ctaLabel: ar ? 'انظر إلى ما تبقّى' : 'See what remains', allowPrevious: false },
    { id: 'world-changed', eyebrow: ar ? 'تم تحديث حالة العالم' : 'WORLD STATE UPDATED', title: ar ? 'ستتذكر بغداد هذه الإشارة.' : 'Baghdad will remember this Signal.', narration: ar ? 'تحمل المدينة الآن أثراً ظاهراً لهذا المسار المكتمل، وستستجيب إشارة أخرى حين تصبح مهمتها المُعدّة مباشرة.' : 'The city now carries a visible trace of this completed path. Another Signal will answer when its prepared mission becomes live.', visualKey: 'city', layout: 'left', motion: 'drift', atmosphere: 'gold', ctaLabel: ar ? 'شاهد العالم بعد تغيّره' : 'See the changed world' },
  ] }
}
