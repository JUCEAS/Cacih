-- =====================================================================
-- CACIH · Actualización 1.2: suspender, reactivar y eliminar usuarios
-- Pegar completo en Supabase → proyecto cacih → SQL Editor → Run
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

alter table public.perfiles
  add column if not exists suspendido_en timestamptz,
  add column if not exists suspendido_por uuid references auth.users(id) on delete set null,
  add column if not exists motivo_suspension text;
create index if not exists perfiles_suspendido_por_idx on public.perfiles(suspendido_por);

create table if not exists public.bitacora_usuarios (
  id bigint generated always as identity primary key,
  usuario_afectado uuid,
  email_afectado text,
  accion text not null,
  detalle text,
  realizado_por uuid default auth.uid(),
  creado_en timestamptz not null default now()
);
alter table public.bitacora_usuarios enable row level security;
drop policy if exists "admin lee historial de usuarios" on public.bitacora_usuarios;
create policy "admin lee historial de usuarios" on public.bitacora_usuarios for select to authenticated using (public.es_admin());

-- Nunca quedarse sin un administrador activo
create or replace function public.proteger_ultimo_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.rol = 'admin' and old.activo)
     or (tg_op = 'UPDATE' and old.rol = 'admin' and old.activo and (new.rol <> 'admin' or not new.activo)) then
    if not exists (select 1 from public.perfiles where rol = 'admin' and activo and user_id <> old.user_id) then
      raise exception 'Debe quedar al menos un administrador activo.';
    end if;
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.proteger_ultimo_admin() from public, anon, authenticated;
drop trigger if exists perfiles_ultimo_admin on public.perfiles;
create trigger perfiles_ultimo_admin before update or delete on public.perfiles
  for each row execute function public.proteger_ultimo_admin();

-- Suspender: bloquea el acceso y quita sus avisos; conserva su historial
create or replace function public.suspender_usuario(p_id uuid, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  if p_id = auth.uid() then raise exception 'No puede suspender su propia cuenta.'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'Escriba el motivo de la suspensión.'; end if;
  update public.perfiles set activo = false, suspendido_en = now(), suspendido_por = auth.uid(), motivo_suspension = trim(p_motivo)
    where user_id = p_id returning email into v_email;
  if not found then raise exception 'Usuario no encontrado'; end if;
  delete from public.push_suscripciones where user_id = p_id;
  insert into public.bitacora_usuarios(usuario_afectado, email_afectado, accion, detalle) values (p_id, v_email, 'Suspendido', trim(p_motivo));
end $$;

-- Activar o reactivar
create or replace function public.activar_usuario(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text; v_antes timestamptz;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  select suspendido_en into v_antes from public.perfiles where user_id = p_id;
  update public.perfiles set activo = true, suspendido_en = null, suspendido_por = null, motivo_suspension = null
    where user_id = p_id returning email into v_email;
  if not found then raise exception 'Usuario no encontrado'; end if;
  insert into public.bitacora_usuarios(usuario_afectado, email_afectado, accion)
    values (p_id, v_email, case when v_antes is null then 'Activado' else 'Reactivado' end);
end $$;

-- Cambiar rol (queda registrado)
create or replace function public.cambiar_rol(p_id uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text; v_antes text;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  if p_id = auth.uid() then raise exception 'No puede cambiar su propio rol.'; end if;
  if p_rol not in ('promotor','oficina','admin') then raise exception 'Rol no válido'; end if;
  select rol into v_antes from public.perfiles where user_id = p_id;
  update public.perfiles set rol = p_rol where user_id = p_id returning email into v_email;
  if not found then raise exception 'Usuario no encontrado'; end if;
  insert into public.bitacora_usuarios(usuario_afectado, email_afectado, accion, detalle) values (p_id, v_email, 'Cambio de rol', v_antes || ' → ' || p_rol);
end $$;

-- Eliminar: solo cuentas sin solicitudes registradas ni revisadas
create or replace function public.eliminar_usuario(p_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_email text;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  if p_id = auth.uid() then raise exception 'No puede eliminar su propia cuenta.'; end if;
  if exists (select 1 from public.solicitudes where promotor_id = p_id or revisado_por = p_id) then
    raise exception 'Esta persona tiene solicitudes registradas o revisadas. Para conservar el historial, suspéndala en lugar de eliminarla.';
  end if;
  select email into v_email from public.perfiles where user_id = p_id;
  if v_email is null then raise exception 'Usuario no encontrado'; end if;
  delete from public.perfiles where user_id = p_id;
  delete from auth.users where id = p_id;
  insert into public.bitacora_usuarios(usuario_afectado, email_afectado, accion) values (p_id, v_email, 'Eliminado');
end $$;

-- Cuántas solicitudes tiene cada usuario
create or replace function public.resumen_usuarios() returns table(user_id uuid, registradas bigint, revisadas bigint)
language sql stable security definer set search_path = public as $$
  select p.user_id,
    (select count(*) from public.solicitudes s where s.promotor_id = p.user_id),
    (select count(*) from public.solicitudes s where s.revisado_por = p.user_id)
  from public.perfiles p where public.es_admin()
$$;

revoke execute on function public.suspender_usuario(uuid,text), public.activar_usuario(uuid), public.cambiar_rol(uuid,text),
  public.eliminar_usuario(uuid), public.resumen_usuarios() from public, anon;
grant execute on function public.suspender_usuario(uuid,text), public.activar_usuario(uuid), public.cambiar_rol(uuid,text),
  public.eliminar_usuario(uuid), public.resumen_usuarios() to authenticated;

-- =====================================================================
-- Limpieza de los datos de prueba (usuarios @prueba.hn y su solicitud)
-- =====================================================================
delete from public.bitacora where solicitud_id in
  (select id from public.solicitudes where promotor_id in (select id from auth.users where email like '%@prueba.hn'));
delete from public.solicitudes where promotor_id in (select id from auth.users where email like '%@prueba.hn');
delete from auth.users where email like '%@prueba.hn';
select setval('public.folio_seq', 1, false) where not exists (select 1 from public.solicitudes);

-- Verificación: debe mostrar solo cuentas reales
select email, rol, activo from public.perfiles order by creado_en;
