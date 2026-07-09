-- ============================================================
-- Agregar teléfono al perfil de usuario
-- Ejecutar en el SQL Editor de Supabase (después de 0001).
-- ============================================================

-- 1) Columna teléfono
alter table public.profiles
  add column if not exists telefono text;

-- 2) Actualizar el trigger de alta para guardar el teléfono del registro
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

  insert into public.profiles (id, email, nombre, telefono, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    new.raw_user_meta_data ->> 'telefono',
    rol_asignado
  );

  return new;
end;
$$;
