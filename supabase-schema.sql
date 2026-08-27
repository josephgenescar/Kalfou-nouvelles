create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  email text not null,
  title text not null,
  category text not null,
  summary text not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.publicity (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company text not null,
  email text not null,
  type text not null,
  message text not null,
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.publicity add column if not exists image_url text;
alter table public.publicity add column if not exists status text not null default 'pending';

insert into storage.buckets (id, name, public)
values ('publicity-images', 'publicity-images', true)
on conflict (id) do nothing;

alter table public.articles enable row level security;
alter table public.contacts enable row level security;
alter table public.publicity enable row level security;

create policy "Published articles are public"
on public.articles for select
to anon, authenticated
using (status = 'published');

create policy "Anyone can submit an article"
on public.articles for insert
to anon, authenticated
with check (status = 'pending');

create policy "Anyone can send a contact message"
on public.contacts for insert
to anon, authenticated
with check (true);

create policy "Anyone can request publicity"
on public.publicity for insert
to anon, authenticated
with check (true);

create policy "Published publicity is public"
on public.publicity for select
to anon, authenticated
using (status = 'published');

create policy "Publicity images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'publicity-images');
