# THE TEN — First Activation evidence rationale

Evidence check updated: 2026-09-08

This note records the evidence boundaries behind the learner/facilitator interaction design. It does **not** replace the canonical `THE_TEN_FIRST_ACTIVATION_CONTENT_v1.0` educational package. Where the package specifies a sequence or interval, the implementation preserves that source rather than silently substituting a literature-derived value.

## 1. Peer Instruction is used selectively, not as a blanket claim of superiority

The 2026 systematic review/meta-analysis of Mazur-style Peer Instruction in medical and dental education identified 17 eligible studies (12 in meta-analysis). It found large within-session conceptual gains but no statistically significant performance superiority over alternative instructional approaches, and evidence for long-term retention/transfer remained limited.

Implementation consequence:

- Keep the canonical sequence `individual commit → peer discussion → revote → reveal` only on stages explicitly marked `peerInstruction`.
- Non-peer stages skip Discussion/Revote instead of forcing a fashionable interaction onto every question.
- Store changed-answer and confidence-shift data as learning-process signals; do not label them competence or mastery.
- Do not market THE TEN as proven superior to other well-designed active-learning methods.

Reference: *Mazur’s Peer Instruction in Medical Education: A Systematic Review and Meta-Analysis*. Medical Science Educator. 2026. DOI: `10.1007/s40670-026-02744-1`. PubMed PMID: `42438533`.

## 2. Audience-response technology is an enabler, not the pedagogy itself

BEME and later systematic reviews of audience-response systems in health-professions education found positive learner reactions and some learning benefits, but results are heterogeneous and higher-quality evidence has not consistently shown that the technology itself outperforms other interactive teaching.

Implementation consequence:

- The phone is a low-friction response surface for private commitment, confidence, revote and structured reasoning.
- The educational mechanism remains the reasoning task, peer explanation, feedback and facilitator debrief—not the polling interface.
- No points, speed rewards or engagement gimmicks are added merely to increase clicks.

References:

- Nelson C, Hartling L, Campbell S, Oswald AE. *The effects of audience response systems on learning outcomes in health professions education. A BEME systematic review: BEME Guide No. 21.* Medical Teacher. 2012. DOI: `10.3109/0142159X.2012.680938`. PMID: `22578049`.
- Iskander M. *Systematic review of the implementation of audience response systems and their impact on participation and engagement in the education of healthcare professionals.* 2018. PMID: `35515888`.

## 3. Confidence is a calibration signal, not a mark multiplier

The medical-education confidence literature emphasizes that confidence is task- and context-specific and should be considered alongside—not substituted for—competence.

Implementation consequence:

- Capture confidence only where the canonical mission calls for it.
- Display confidence shifts to facilitators as metacognitive/process information.
- Do not award marks for high confidence or punish low confidence.
- Do not infer competence from confidence alone.

References:

- Gottlieb M et al. *Confidence-competence alignment and the role of self-confidence in medical education: A conceptual review.* Medical Education. 2022;56(1):37-47. DOI: `10.1111/medu.14592`. PMID: `34176144`.
- Garbayo LS et al. *A metacognitive confidence calibration (MCC) tool to help medical students scaffold diagnostic reasoning...* Advances in Physiology Education. 2023;47(1):71-81. DOI: `10.1152/advan.00156.2021`. PMID: `35981722`.

## 4. Nexus Echo uses retrieval practice, while preserving the package’s 60-hour timing

A 2024 systematic review of distributed and retrieval practice in health-professions education included 56 studies / 63 experiments; 43 experiments demonstrated significant benefit over comparison/control conditions, with substantial heterogeneity in intervention design and timing. A 2026 medical-education meta-analysis also found an overall performance benefit for spaced repetition while noting uncertainty about optimal design and delivery.

Implementation consequence:

- Nexus Echo requires the learner to retrieve before the answer anchor is shown.
- The current canonical package uses a 60-hour unlock, which lies inside its specified 48–72 hour window.
- The product does **not** claim that 60 hours is an evidence-established optimal interval; it is the current program design choice.
- Echo remains low-stakes and does not independently create a competence claim.

References:

- Trumble E, Lodge J, Mandrusiak A, Forbes R. *Systematic review of distributed practice and retrieval practice in health professions education.* Advances in Health Sciences Education. 2024;29(2):689-714. DOI: `10.1007/s10459-023-10274-3`. PMID: `37615780`.
- Maye JA, Hurley F. *The Effectiveness of Spaced Repetition in Medical Education: A Systematic Review and Meta-Analysis.* The Clinical Teacher. 2026;23(2):e70353. DOI: `10.1111/tct.70353`. PMID: `41601436`.

## 5. Mobile-first is an operational choice supported by, but not justified solely by, mLearning evidence

A systematic review/meta-analysis of mobile digital education in health professions found encouraging evidence that mobile learning can be at least comparable with traditional learning and may improve some knowledge/skills outcomes, but study heterogeneity and risk of bias limit strong causal claims.

Implementation consequence:

- Design the live learner surface for a phone held in one hand while the learner participates in teaching/discussion on a separate device or in person.
- Keep one dominant action per live state, large touch targets, minimal scrolling and clear waiting/locked states.
- Do not describe the phone format itself as educationally superior.

Reference: Dunleavy G et al. *Mobile Digital Education for Health Professions: Systematic Review and Meta-Analysis by the Digital Health Education Collaboration.* Journal of Medical Internet Research. 2019. PMID: `30747711`.

## 6. Claims boundary

THE TEN First Activation is implemented and described as a **structured, low-stakes clinical-reasoning learning experience**. Current evidence and the program package support active reasoning, peer explanation, calibration, retrieval and formative feedback as educational strategies. They do not support using this prototype alone as a validated measure of clinical competence, long-term transfer, patient outcomes or superiority over other high-quality active curricula.

Accordingly the platform:

- avoids public ranking and speed rewards;
- separates process metrics from competence claims;
- keeps formal grading human-governed where written scoring is involved;
- labels the certificate as completion, not competence certification;
- preserves facilitator fidelity records so later evaluation can distinguish intervention design from how it was actually delivered.
