create or replace function private.validate_live_activity_structure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_status text;
  activity_kind text;
  activity_program uuid;
  objective_program uuid;
begin
  if tg_table_name = 'live_activities' then
    if tg_op = 'DELETE' then
      if old.status <> 'draft' then raise exception 'Opened live activity cannot be deleted'; end if;
      return old;
    end if;

    if tg_op = 'UPDATE' then
      if new.run_id <> old.run_id
         or new.activity_type <> old.activity_type
         or coalesce(new.title, '') <> coalesce(old.title, '')
         or new.stem <> old.stem
         or new.position <> old.position
         or coalesce(new.max_response_seconds, -1) <> coalesce(old.max_response_seconds, -1) then
        if old.status <> 'draft' or new.status <> 'draft' then
          raise exception 'Live activity content is locked once delivery starts';
        end if;
      end if;

      if new.current_round < old.current_round then raise exception 'Live activity round cannot move backwards'; end if;
      if new.current_round > old.current_round and not (
        old.activity_type = 'peer_instruction'
        and old.status = 'discussion'
        and new.status = 'open'
        and old.current_round = 1
        and new.current_round = 2
      ) then
        raise exception 'Round 2 is reserved for Peer Instruction after discussion';
      end if;

      if old.status <> new.status then
        if old.status = 'draft' and new.status <> 'open' then
          raise exception 'Draft activity must be opened first';
        elsif old.status = 'open' and new.status not in ('discussion', 'revealed', 'closed') then
          raise exception 'Open activity transition is invalid';
        elsif old.status = 'discussion' and new.status not in ('open', 'revealed', 'closed') then
          raise exception 'Discussion activity transition is invalid';
        elsif old.status = 'revealed' and new.status <> 'closed' then
          raise exception 'Revealed activity can only be closed';
        elsif old.status = 'closed' then
          raise exception 'Closed activity is immutable';
        end if;
      end if;
      new.updated_at := now();
    end if;
    return new;
  end if;

  if tg_table_name = 'live_activity_rounds' then
    select la.status, la.activity_type into parent_status, activity_kind
    from public.live_activities la where la.id = coalesce(new.activity_id, old.activity_id);

    if tg_op = 'INSERT' then
      if parent_status <> 'draft' then raise exception 'Rounds must be authored before activity opens'; end if;
      if new.round_number = 2 and activity_kind <> 'peer_instruction' then
        raise exception 'Round 2 is reserved for Peer Instruction';
      end if;
      return new;
    elsif tg_op = 'DELETE' then
      if parent_status <> 'draft' then raise exception 'Rounds are locked once activity opens'; end if;
      return old;
    else
      if new.activity_id <> old.activity_id or new.round_number <> old.round_number then
        raise exception 'Live round identity is immutable';
      end if;
      if old.status <> new.status then
        if old.status = 'draft' and new.status <> 'open' then raise exception 'Draft round must be opened first';
        elsif old.status = 'open' and new.status not in ('closed', 'revealed') then raise exception 'Open round can only close or reveal';
        elsif old.status = 'closed' and new.status <> 'revealed' then raise exception 'Closed round can only be revealed';
        elsif old.status = 'revealed' then raise exception 'Revealed round is immutable';
        end if;
      end if;
      if old.opened_at is null and new.status = 'open' then new.opened_at := now(); end if;
      if old.status = 'open' and new.status = 'closed' then new.closed_at := now(); end if;
      if new.status = 'revealed' and old.status <> 'revealed' then
        new.revealed_at := now();
        new.closed_at := coalesce(new.closed_at, now());
      end if;
      return new;
    end if;
  end if;

  if tg_table_name = 'live_activity_options' then
    select la.status into parent_status
    from public.live_activities la
    where la.id = coalesce(new.activity_id, old.activity_id);

    if parent_status <> 'draft' then raise exception 'Live activity structure is locked once delivery starts'; end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'live_activity_answer_keys' then
    select la.status into parent_status
    from public.live_activities la
    where la.id = coalesce(new.activity_id, old.activity_id);

    if parent_status <> 'draft' then raise exception 'Live activity structure is locked once delivery starts'; end if;
    if tg_op = 'DELETE' then return old; end if;

    if new.correct_option_id is not null and not exists (
      select 1 from public.live_activity_options lao
      where lao.id = new.correct_option_id and lao.activity_id = new.activity_id
    ) then
      raise exception 'Correct option must belong to the same activity';
    end if;

    new.updated_at := now();
    return new;
  end if;

  if tg_table_name = 'live_activity_learning_objectives' then
    select la.status, c.program_id into parent_status, activity_program
    from public.live_activities la
    join public.live_session_runs lsr on lsr.id = la.run_id
    join public.sessions s on s.id = lsr.session_id
    join public.cohorts c on c.id = s.cohort_id
    where la.id = coalesce(new.activity_id, old.activity_id);

    if parent_status <> 'draft' then raise exception 'Learning-objective mapping is locked once activity opens'; end if;
    if tg_op <> 'DELETE' then
      select lo.program_id into objective_program from public.learning_objectives lo where lo.id = new.learning_objective_id;
      if objective_program is null or objective_program <> activity_program then
        raise exception 'Live activity and learning objective must belong to the same program';
      end if;
      return new;
    end if;
    return old;
  end if;

  return new;
end;
$$;
