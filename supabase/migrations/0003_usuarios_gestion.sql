-- ============================================================
-- Gestión de usuarios: username, apellido y rol "cliente"
-- Ejecutar en el SQL Editor de Supabase (después de 0002).
-- ============================================================

-- 1) Nuevas columnas en profiles
alter table public.profiles
  add column if not exists username text,
  add column if not exists apellido text;

-- Username único (permitiendo nulos)
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

-- 2) Permitir el rol 'cliente' además de 'admin' y 'lector'
alter table public.profiles
  drop constraint if exists profiles_rol_check;

alter table public.profiles
  add constraint profiles_rol_check
  check (rol in ('admin', 'lector', 'cliente'));

-- 3) Actualizar el trigger de alta:
--    - Primer usuario => admin
--    - El resto => cliente (antes era 'lector')
--    - Guarda username/apellido si vienen en la metadata del registro
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
    rol_asignado := 'cliente';
  end if;

  insert into public.profiles (id, email, nombre, apellido, username, telefono, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    new.raw_user_meta_data ->> 'apellido',
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'telefono',
    rol_asignado
  );

  return new;
end;
$$;
