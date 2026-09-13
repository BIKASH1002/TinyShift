-- AI-powered routine refresh suggestions
-- Gemini is called only from the Supabase Edge Function, never from frontend code.
create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  suggestion_text text not null,
  reason text,
  status text not null default 'shown',
  source text not null default 'gemini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_suggestions_status_check check (status in ('shown', 'accepted', 'rejected', 'completed'))
);

create index if not exists ai_suggestions_user_id_idx on public.ai_suggestions (user_id);

create index if not exists ai_suggestions_user_status_idx on public.ai_suggestions (user_id, status);

create index if not exists ai_suggestions_created_at_idx on public.ai_suggestions (created_at);

alter table public.ai_suggestions enable row level security;

create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Users can read their own AI suggestions" on public.ai_suggestions;

create policy "Users can read their own AI suggestions" on public.ai_suggestions
  for select to authenticated
  using (auth.uid () = user_id);

drop policy if exists "Users can insert their own AI suggestions" on public.ai_suggestions;

create policy "Users can insert their own AI suggestions" on public.ai_suggestions
  for insert to authenticated
  with check (auth.uid () = user_id);

drop policy if exists "Users can update their own AI suggestions" on public.ai_suggestions;

create policy "Users can update their own AI suggestions" on public.ai_suggestions
  for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

drop policy if exists "Users can delete their own AI suggestions" on public.ai_suggestions;

create policy "Users can delete their own AI suggestions" on public.ai_suggestions
  for delete to authenticated
  using (auth.uid () = user_id);

drop trigger if exists set_ai_suggestions_updated_at on public.ai_suggestions;

create trigger set_ai_suggestions_updated_at
  before update on public.ai_suggestions for each row
  execute function public.set_updated_at ();

