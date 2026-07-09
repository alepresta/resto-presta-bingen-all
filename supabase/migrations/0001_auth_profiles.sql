-- ============================================================
-- Auth: tabla de perfiles con roles (admin / lector)
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1) Tabla de perfiles, 1 a 1 con auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'lector' check (rol in ('admin', 'lector')),
  created_at timestamptz not null default now()
);

-- 2) Habilitar Row Level Security
alter table public.profiles enable row level security;

-- 3) Políticas:
--    - Cada usuario puede ver y editar (nombre) su propio perfil.
--    - Nadie puede cambiar su propio rol desde el cliente (se controla abajo).
drop policy if exists "perfil_propio_select" on public.profiles;
create policy "perfil_propio_select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "perfil_propio_update" on public.profiles;
create policy "perfil_propio_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4) Trigger: crear automáticamente el perfil al registrarse un usuario.
--    El primer usuario registrado queda como 'admin'; el resto como 'lector'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_usuarios int;
  rol_asignado text;
begin
  select count(*) into total_usuarios from public.profiles;
  if total_usuarios = 0 then
    rol_asignado := 'admin';
  else
    rol_asignado := 'lector';
  end if;

  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    rol_asignado
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Evitar que un usuario se auto-promueva a admin:
--    Bloquear cambios de la columna rol vía RLS de update (regla a nivel de trigger).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.rol is distinct from old.rol then
    -- Solo permitir el cambio de rol si lo hace un service_role (backend).
    if auth.role() <> 'service_role' then
      new.rol := old.rol;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_escalation_trg on public.profiles;
create trigger prevent_role_escalation_trg
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
