alter table public.publicity add column if not exists image_url text;
alter table public.publicity add column if not exists status text not null default 'pending';

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
