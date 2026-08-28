alter table public.publicity add column if not exists image_url text;
alter table public.publicity add column if not exists status text not null default 'pending';
alter table public.articles add column if not exists image_url text;

create table if not exists public.newsletter_subscribers (
	id uuid primary key default gen_random_uuid(),
	email text unique not null,
	created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to newsletter"
on public.newsletter_subscribers for insert
to anon, authenticated
with check (true);

insert into storage.buckets (id, name, public)
values ('publicity-images', 'publicity-images', true)
on conflict (id) do nothing;

drop policy if exists "Published publicity is public" on public.publicity;
create policy "Published publicity is public"
on public.publicity for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Publicity images are publicly readable" on storage.objects;
create policy "Publicity images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'publicity-images');

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

drop policy if exists "Article images are publicly readable" on storage.objects;
create policy "Article images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'article-images');
