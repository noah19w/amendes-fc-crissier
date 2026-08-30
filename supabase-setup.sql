-- À exécuter une fois dans Supabase : SQL Editor > New query > coller > Run

create table if not exists fc_crissier_data (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- Active RLS puis autorise la lecture/écriture publique (pas de login requis).
-- Suffisant pour un outil d'équipe interne avec lien non indexé.
-- Si tu veux restreindre l'accès plus tard, remplace ces policies par une
-- vérification d'authentification Supabase.
alter table fc_crissier_data enable row level security;

create policy "Lecture publique" on fc_crissier_data
  for select using (true);

create policy "Écriture publique" on fc_crissier_data
  for all using (true) with check (true);
