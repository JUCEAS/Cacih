-- =====================================================================
-- CACIH · Actualización 1.3 (complemento)
-- Permite registrar socios extranjeros residentes (carné de residente o pasaporte).
-- Pegar en Supabase → proyecto cacih → SQL Editor → Run
-- =====================================================================

-- Quita la regla vieja que solo aceptaba DNI de 13 dígitos
alter table public.solicitudes drop constraint if exists solicitudes_dni_check;

-- Activa la regla nueva (DNI de 13 dígitos, o documento de 5 a 20 caracteres para extranjeros)
alter table public.solicitudes validate constraint solicitudes_documento_valido;

-- Verificación: debe mostrar solicitudes_documento_valido y solicitudes_tipo_documento_check
select conname from pg_constraint
where conrelid = 'public.solicitudes'::regclass and contype = 'c' and conname like 'solicitudes_%doc%';
