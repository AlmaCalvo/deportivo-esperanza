-- ============================================================================
-- DEPORTIVO ESPERANZA · VÓLEY — ESQUEMA DE BASE DE DATOS (Supabase / PostgreSQL)
-- ============================================================================
-- Cómo usarlo:
-- 1. Entrá a tu proyecto en https://supabase.com -> SQL Editor -> "New query"
-- 2. Pegá este script completo y ejecutalo (Run).
-- 3. Repetilo solo una vez; si necesitás volver a correrlo, borrá antes las
--    tablas o usá un proyecto nuevo (el script no es 100% idempotente).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. JUGADORAS
-- ----------------------------------------------------------------------------
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  number       int  not null unique,           -- Número de camiseta (#)
  name         text not null,                  -- Nombre y apellido
  position     text,                           -- Punta, Central, Líbero, Armadora, Opuesta...
  email        text unique,                    -- Email con el que la jugadora se registra
  auth_user_id uuid unique references auth.users(id) on delete set null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.players is 'Plantel de jugadoras del equipo.';

-- ----------------------------------------------------------------------------
-- 2. PERFILES (rol de cada usuario autenticado: jugadora o cuerpo técnico)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'jugadora' check (role in ('jugadora', 'cuerpo_tecnico')),
  player_id  uuid references public.players(id) on delete set null,
  full_name  text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Rol de cada usuario: jugadora (solo lectura de sus datos) o cuerpo_tecnico (carga y edita estadísticas).';

-- Crea automáticamente un perfil "jugadora" cuando alguien se registra.
-- El cuerpo técnico después puede promoverlo a 'cuerpo_tecnico' y/o
-- vincularlo a su fila en players (ver sección 7, ejemplos de uso).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. PARTIDOS / TORNEO
-- ----------------------------------------------------------------------------
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  opponent    text not null,               -- Rival (ej: "Belgrano", "Pringles")
  match_date  date not null default current_date,
  tournament  text,                        -- Nombre del torneo/liga
  location    text,                        -- Local / Visitante / Cancha
  sets_local  int default 0,               -- Sets ganados por Deportivo Esperanza
  sets_rival  int default 0,               -- Sets ganados por el rival
  status      text not null default 'en_curso' check (status in ('en_curso', 'finalizado')),
  created_at  timestamptz not null default now()
);

comment on table public.matches is 'Un registro por partido jugado.';

-- ----------------------------------------------------------------------------
-- 4. ESTADÍSTICAS POR JUGADORA Y POR PARTIDO
-- ----------------------------------------------------------------------------
-- Una fila = el acumulado de una jugadora en un partido puntual.
-- El detalle "partido por partido" (drill-down) surge de filtrar esta tabla
-- por player_id; el total del torneo surge de sumar todas sus filas.
create table if not exists public.match_stats (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,

  sj  int not null default 0,   -- Sets Jugados

  -- Saque
  is_intentos int not null default 0,  -- Intentos de Saque (IS)
  ac  int not null default 0,          -- Aces (AC)
  es  int not null default 0,          -- Errores de Saque (ES)

  -- Ataque
  rem int not null default 0,          -- Remates / Puntos de Ataque (REM)
  ea  int not null default 0,          -- Errores de Ataque (EA)

  -- Recepción
  rec int not null default 0,          -- Recepciones Positivas (REC)
  erc int not null default 0,          -- Errores de Recepción (ERC)

  -- Bloqueo
  bi  int not null default 0,          -- Bloqueos Individuales (BI)
  bc  int not null default 0,          -- Bloqueos Colectivos (BC)
  eb  int not null default 0,          -- Errores de Bloqueo (EB)

  -- Colocación
  ic  int not null default 0,          -- Intentos de Colocación (IC)
  ast int not null default 0,          -- Asistencias (AST)
  ec  int not null default 0,          -- Errores de Colocación (EC)

  -- Defensa
  def int not null default 0,          -- Defensas Exitosas (DEF)
  edf int not null default 0,          -- Errores de Defensa (EDF)

  updated_at timestamptz not null default now(),

  unique (match_id, player_id)
);

comment on table public.match_stats is 'Estadísticas acumuladas de cada jugadora en cada partido. Se actualiza en vivo desde la pantalla de carga rápida.';

-- Mantiene updated_at al día en cada UPDATE
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_match_stats_updated_at on public.match_stats;
create trigger trg_match_stats_updated_at
  before update on public.match_stats
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. FUNCIÓN RPC PARA SUMAR/RESTAR UNA ACCIÓN EN VIVO (+1 / -1, para Deshacer)
-- ----------------------------------------------------------------------------
-- Uso desde React: supabase.rpc('increment_stat', { p_match_id, p_player_id, p_column, p_delta })
-- p_delta = 1 para sumar la acción, -1 para deshacerla.
create or replace function public.increment_stat(
  p_match_id  uuid,
  p_player_id uuid,
  p_column    text,
  p_delta     int default 1
)
returns public.match_stats
language plpgsql
security definer set search_path = public
as $$
declare
  allowed_columns text[] := array['sj','is_intentos','ac','es','rem','ea','rec','erc',
                                   'bi','bc','eb','ic','ast','ec','def','edf'];
  result public.match_stats;
begin
  if not (p_column = any(allowed_columns)) then
    raise exception 'Columna de estadística no válida: %', p_column;
  end if;

  insert into public.match_stats (match_id, player_id)
  values (p_match_id, p_player_id)
  on conflict (match_id, player_id) do nothing;

  execute format(
    'update public.match_stats set %I = greatest(%I + $1, 0) where match_id = $2 and player_id = $3 returning *',
    p_column, p_column
  ) into result using p_delta, p_match_id, p_player_id;

  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. VISTA: TOTALES ACUMULADOS POR JUGADORA (todo el torneo)
-- ----------------------------------------------------------------------------
create or replace view public.player_totals as
select
  p.id as player_id,
  p.number,
  p.name,
  count(distinct ms.match_id) as partidos_jugados,
  coalesce(sum(ms.sj), 0)  as sj,
  coalesce(sum(ms.is_intentos), 0) as is_intentos,
  coalesce(sum(ms.ac), 0)  as ac,
  coalesce(sum(ms.es), 0)  as es,
  coalesce(sum(ms.rem), 0) as rem,
  coalesce(sum(ms.ea), 0)  as ea,
  coalesce(sum(ms.rec), 0) as rec,
  coalesce(sum(ms.erc), 0) as erc,
  coalesce(sum(ms.bi), 0)  as bi,
  coalesce(sum(ms.bc), 0)  as bc,
  coalesce(sum(ms.eb), 0)  as eb,
  coalesce(sum(ms.ic), 0)  as ic,
  coalesce(sum(ms.ast), 0) as ast,
  coalesce(sum(ms.ec), 0)  as ec,
  coalesce(sum(ms.def), 0) as def,
  coalesce(sum(ms.edf), 0) as edf
from public.players p
left join public.match_stats ms on ms.player_id = p.id
group by p.id, p.number, p.name;

-- ----------------------------------------------------------------------------
-- 7. SEGURIDAD (Row Level Security)
-- ----------------------------------------------------------------------------
-- Regla general del club:
--   - Cualquier usuaria/o autenticada/o (jugadora o cuerpo técnico) puede VER
--     todas las estadísticas del equipo (transparencia total del plantel).
--   - Solo el 'cuerpo_tecnico' puede CARGAR o EDITAR datos (partidos y stats).
--   - Cada jugadora solo puede ver/editar su propio perfil.

alter table public.players     enable row level security;
alter table public.profiles    enable row level security;
alter table public.matches     enable row level security;
alter table public.match_stats enable row level security;

-- Helper: ¿el usuario actual es cuerpo técnico?
create or replace function public.is_staff()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'cuerpo_tecnico'
  );
$$;

-- players: lectura para cualquier autenticado; escritura solo staff
drop policy if exists "players_select_authenticated" on public.players;
create policy "players_select_authenticated" on public.players
  for select using (auth.role() = 'authenticated');
drop policy if exists "players_write_staff" on public.players;
create policy "players_write_staff" on public.players
  for all using (public.is_staff()) with check (public.is_staff());

-- profiles: cada quien ve/edita su propio perfil; staff ve todos
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_update_staff" on public.profiles
  for update using (public.is_staff());

-- matches: lectura para cualquier autenticado; escritura solo staff
drop policy if exists "matches_select_authenticated" on public.matches;
create policy "matches_select_authenticated" on public.matches
  for select using (auth.role() = 'authenticated');
drop policy if exists "matches_write_staff" on public.matches;
create policy "matches_write_staff" on public.matches
  for all using (public.is_staff()) with check (public.is_staff());

-- match_stats: lectura para cualquier autenticado; escritura solo staff
drop policy if exists "match_stats_select_authenticated" on public.match_stats;
create policy "match_stats_select_authenticated" on public.match_stats
  for select using (auth.role() = 'authenticated');
drop policy if exists "match_stats_write_staff" on public.match_stats;
create policy "match_stats_write_staff" on public.match_stats
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- 8. DATOS DE EJEMPLO (opcional — comentado por defecto)
-- ----------------------------------------------------------------------------
-- insert into public.players (number, name, position) values
--   (4, 'Lucía Fernández', 'Armadora'),
--   (7, 'Martina Gómez', 'Punta'),
--   (9, 'Sofía Álvarez', 'Central'),
--   (11, 'Camila Ruiz', 'Líbero');
--
-- insert into public.matches (opponent, tournament, location) values
--   ('Belgrano', 'Torneo Apertura', 'Local'),
--   ('Pringles', 'Torneo Apertura', 'Visitante');

-- ============================================================================
-- LISTO. Después de correr este script, en Authentication > Providers activá
-- "Email" para que las jugadoras y el cuerpo técnico puedan registrarse.
-- Para convertir a alguien en cuerpo técnico, corré por ejemplo:
--   update public.profiles set role = 'cuerpo_tecnico' where id = '<uuid-del-usuario>';
-- Para vincular una cuenta ya registrada con su fila de jugadora:
--   update public.players set auth_user_id = '<uuid-del-usuario>' where number = 7;
-- ============================================================================
