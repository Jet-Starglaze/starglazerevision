alter table if exists public.user_question_progress
  add column if not exists times_skipped integer not null default 0;

alter table if exists public.user_question_progress
  add column if not exists last_skipped_at timestamptz;

do $$
begin
  if to_regclass('public.user_question_progress') is not null then
    create index if not exists user_question_progress_user_id_last_skipped_at_idx
      on public.user_question_progress (user_id, last_skipped_at desc);
  end if;
end
$$;
