-- Cover the reviewer foreign key and direct reviewer lookups used by the teacher task queue.
create index if not exists review_assignments_reviewer_idx
  on public.review_assignments(reviewer_id);
