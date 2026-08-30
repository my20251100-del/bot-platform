-- Run in Supabase SQL Editor
alter table public.bots add column if not exists qr text;
alter table public.bots add column if not exists command text not null default 'stop';
alter table public.bots add column if not exists linked_number text;
