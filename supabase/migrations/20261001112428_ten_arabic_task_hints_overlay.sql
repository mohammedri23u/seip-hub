create table if not exists private.assessment_task_hints (
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  language_code text not null,
  hint_text text not null check (btrim(hint_text) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_version_id, language_code)
);

comment on table private.assessment_task_hints is
  'Learner-facing task-language scaffolds stored separately from immutable scientific source rows. Hints must clarify the task without revealing keyed answers or rubric criteria.';

with hint_map(position, hint_text) as (
  values
    (1, 'المطلوب: اكتب 3 أسئلة أو معلومات إضافية تريد تعرفها من الـHistory، ولكل واحد وضّح باختصار شلون راح يساعدك بالـDifferential diagnosis أو تقدير الـurgency/safety. لا تحتاج تعطي diagnosis الآن.'),
    (2, 'المطلوب: سوِّ Problem representation بجملة واحدة: من هو المريض + المشكلة الأساسية + أهم findings التي تميّز الحالة. لا تكتب اسم الـdiagnosis وحده، ولا تعيد كل تفاصيل الحالة.'),
    (3, 'المطلوب: اكتب Leading diagnosis أولاً، وبعده 2 plausible alternatives مرتبة حسب الاحتمال. وضّح باختصار شنو evidence الذي خلّاك ترتبهم بهذا الشكل، واذكر الـSafety concern بشكل منفصل إذا طلبه السؤال.'),
    (4, 'المطلوب: اختَر Focused examination مناسب، اذكر أهم components أو abnormal findings التي تبحث عنها، وبعدها وضّح شلون الفحص يساعدك في immediate physiological safety وفي localization للمشكلة.'),
    (5, 'المطلوب: لا تكرر الـfindings منفصلة فقط؛ اجمعها كـpattern واحد وفسّر شنو تعني سريرياً. بعدها جاوب الجزء الثاني تحديداً: شنو الاحتمال أو الخطر الذي صار أضعف، أو شنو الشيء الذي لا تكدر تستنتجه من الـphysiology الحالية.'),
    (6, 'المطلوب: اختَر ONE initial imaging test فقط. اكتب اسم الفحص، شنو الـclinical question الذي يجاوب عنه، وONE limitation مهمة في هذا المريض. لا تحتاج تذكر قائمة فحوصات.'),
    (7, 'المطلوب: اكتب 3 أسئلة إضافية بالـHistory، ولكل سؤال وضّح شلون ممكن يغيّر الـlocalization أو الـDifferential diagnosis أو الـurgency. لا تحاول تخمّن التشخيص النهائي من البداية.'),
    (8, 'المطلوب: لخّص الحالة كلها بجملة واحدة كـProblem representation، وركّز على أهم positive findings والـrelevant negatives وحالة الاستقرار. لا تكتب diagnosis وحده.'),
    (9, 'المطلوب: حدّث الـworking diagnosis بعد المعلومة الجديدة. اذكر هل النتيجة دعمت hypothesis السابقة أو خلتك تغيّرها، وحدد بالضبط شنو الـnew evidence الذي غيّر مستوى ثقتك.'),
    (10, 'المطلوب: اختَر Focused examination مناسب للحالة. اذكر components محددة، ولكل واحد وضّح شنو تبحث عنه وليش. المطلوب فحص موجّه، مو قائمة Physical examination كاملة.'),
    (11, 'المطلوب: ابدأ بـLeading diagnosis ثم 2 plausible alternatives مرتبة حسب الاحتمال، وبعدها برر ترتيبك بالـfindings المتوفرة. إذا السؤال يطلب Safety concern فاذكره بشكل منفصل، وبيّن أي uncertainty مهمة باقية.'),
    (12, 'المطلوب: وضّح شنو تغيّر مقارنة بالحالة السابقة، وهل المريض صار يحتاج urgent أو emergency response. بعدها اذكر ONE priority مرتبطة بالمضاعفة الحالية. لا تحتاج تكتب Management plan كامل.'),
    (13, 'المطلوب: حدد الـphysiological hypothesis التي تفكر بها، واختَر أقوى 2 أو 3 findings تدعمها. بعدها اشرح ليش اجتماع هذه الـfindings أقوى من ذكر كل finding وحده.'),
    (14, 'المطلوب: اختَر الـinitial test المناسب للسياق، ثم اكتب Clinical question واحد واضح يجاوب عنه هذا الفحص. لا تتنبأ بالنتيجة ولا تضيف علاج إذا مو مطلوب.'),
    (15, 'المطلوب: استخدم النتيجة الجديدة لتحديث الـworking diagnosis، ثم اذكر الـnext clinical priority أو immediate safety priority المطلوبة. اربط جوابك بالمعلومة الجديدة بدل ما تعيد وصف الحالة.')
)
insert into private.assessment_task_hints (
  question_version_id,
  language_code,
  hint_text
)
select
  qv.id,
  'ar',
  h.hint_text
from public.question_versions qv
join public.questions q
  on q.id = qv.question_id
join hint_map h
  on h.position = substring(q.question_code from 'TEN-CRA-[AB]([0-9]{2})@')::int
where q.question_code ~ '^TEN-CRA-[AB](0[1-9]|1[0-5])@1\.1\.0$'
on conflict (question_version_id, language_code)
do update
set hint_text = excluded.hint_text,
    updated_at = now();

create or replace function public.get_progressive_assessment_step(target_assessment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  payload jsonb;
  u private.scientific_units;
  learner_hint text;
begin
  payload := private.scientific_legacy_step(target_assessment_id);

  select h.hint_text
    into learner_hint
  from private.assessment_task_hints h
  where h.question_version_id = (payload #>> '{item,question_version_id}')::uuid
    and h.language_code = 'ar';

  if learner_hint is not null then
    payload := jsonb_set(
      payload,
      '{item}',
      (payload -> 'item') || jsonb_build_object('hint_ar', learner_hint)
    );
  end if;

  select *
    into u
  from private.scientific_units
  where question_version_id = (payload #>> '{item,question_version_id}')::uuid;

  if found then
    payload := jsonb_set(
      payload,
      '{item}',
      (payload -> 'item') || jsonb_build_object(
        'source_id', u.source_id,
        'case_number', u.source_payload -> 'case_number',
        'stage_in_case', u.source_payload -> 'stage_in_case',
        'previously_disclosed_facts', u.source_payload -> 'previously_disclosed_facts',
        'new_facts', u.source_payload -> 'new_facts',
        'task', u.source_payload -> 'task'
      )
    );
  end if;

  return payload;
end
$function$;
