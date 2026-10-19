import type { ClassroomMissionCode } from './types'

/** Narrative navigation only. No answer keys, assessment state or learner completion data. */
export const classroomMissionMap = [
  {
    code: 'M01', signal: 1, title: 'البداية: اجمع الصورة', system: 'Cardiorespiratory',
    weeks: 'W1 + W2', sessions: 'S1 + S2', encounters: ['E01', 'E02', 'E03', 'E04'],
    story: 'تبدأ الرحلة بأربع حكايات مترابطة. المعلومة الأولى تفتح احتمالًا؛ والمعلومة التالية تساعدنا على مراجعة الفكرة.',
    task: 'لاحظ المعلومة، اسأل سؤالًا مفيدًا، ثم اشرح ما الذي غيّر رأيك.',
    activation: 'تكتمل هذه Mission بعد S2. لا يمنح S1 مفتاحًا أو يفعّل Signal.',
    next: 'بعد اكتمال Mission واستلام المفتاح، يكون تفعيل Signal يدويًا.',
  },
  {
    code: 'M02', signal: 2, title: 'اتبع أثر المعلومة', system: 'Gastrointestinal',
    weeks: 'W3', sessions: 'S3', encounters: ['E05', 'E06'],
    story: 'نعود إلى بغداد بسؤال أدق: أي تفصيل يستحق أن نتوقف عنده؟ نرتّب المعلومات قبل أن نسمّي الاحتمال.',
    task: 'رتّب التسلسل، اختر سؤالًا واحدًا، وقدّم سببًا قصيرًا لاختيارك.',
    activation: 'تكتمل هذه Mission بعد S3 وتفتح طريق Signal 2.',
    next: 'بعد اكتمال Mission واستلام المفتاح، يكون تفعيل Signal يدويًا.',
  },
  {
    code: 'M03', signal: 3, title: 'حين تتغيّر الأولوية', system: 'Liver + Renal',
    weeks: 'W4', sessions: 'S4', encounters: ['E07', 'E08'],
    story: 'كل دليل له حدود. نتعلّم ما الذي تستطيع المعلومة أن تقوله، ومتى تستدعي المعلومة الجديدة تغيير الأولوية.',
    task: 'فسّر المعلومة في سياقها، وانتبه إلى Safety قبل إكمال الاستنتاج.',
    activation: 'تكتمل هذه Mission بعد S4 وتفتح طريق Signal 3.',
    next: 'بعد اكتمال Mission واستلام المفتاح، يكون تفعيل Signal يدويًا.',
  },
  {
    code: 'M04', signal: 4, title: 'اجمع الخيوط معًا', system: 'Endocrine',
    weeks: 'W5', sessions: 'S5', encounters: ['E09', 'E10'],
    story: 'في المحطة الأخيرة نربط ما تعلّمناه: نمط أولي، سؤال مناسب، وتفسير يتغيّر حين يظهر دليل جديد.',
    task: 'اختر Investigation يجيب عن سؤالك، ووضّح حدود الاستنتاج.',
    activation: 'تكتمل هذه Mission بعد S5 وتفتح طريق Signal 4؛ يأتي Post assessment في W6.',
    next: 'بعد اكتمال Mission واستلام المفتاح، يكون تفعيل Signal يدويًا.',
  },
] as const satisfies ReadonlyArray<{
  code: ClassroomMissionCode
  signal: number
  title: string
  system: string
  weeks: string
  sessions: string
  encounters: readonly string[]
  story: string
  task: string
  activation: string
  next: string
}>

export const classroomWeekMap = [
  { code: 'W0', label: 'التهيئة', duration: '45 دقيقة تقريبًا', detail: 'دليل اللقاء وBaseline', phase: 'assessment' },
  { code: 'S1', label: 'نبدأ بالفكرة', duration: '75 دقيقة', detail: 'W1 · E01 + E02', phase: 'teaching' },
  { code: 'S2', label: 'نكمل M01', duration: '75 دقيقة', detail: 'W2 · E03 + E04', phase: 'teaching' },
  { code: 'S3', label: 'نتبع المعلومة', duration: '75 دقيقة', detail: 'W3 · E05 + E06', phase: 'teaching' },
  { code: 'S4', label: 'نراجع الأولوية', duration: '75 دقيقة', detail: 'W4 · E07 + E08', phase: 'teaching' },
  { code: 'S5', label: 'نجمع الخيوط', duration: '75 دقيقة', detail: 'W5 · E09 + E10', phase: 'teaching' },
  { code: 'W6', label: 'نراجع الرحلة', duration: '45 دقيقة تقريبًا', detail: 'Post assessment والختام', phase: 'assessment' },
] as const
