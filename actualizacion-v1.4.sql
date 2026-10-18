-- =====================================================================
-- CACIH · Actualización 1.4 (complemento)
-- Permite registrar "Actualización de datos" de socios que ya tienen afiliación.
-- Pegar en Supabase → proyecto cacih → SQL Editor → Run
-- =====================================================================

-- Quita la regla vieja que impedía dos solicitudes con el mismo DNI.
-- La regla nueva (ya instalada) solo lo impide entre solicitudes "Nueva".
drop index if exists public.solicitudes_dni_vigente_antiguo;

-- Verificación: debe mostrar solo solicitudes_dni_nueva_vigente
select indexname from pg_indexes where tablename = 'solicitudes' and indexname like 'solicitudes_dni%';
