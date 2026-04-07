-- Migration 017: Rename Sede Quetzaltenango to Sede Central
-- The YBG prefix remains unchanged to avoid any impact on existing locker IDs

UPDATE sucursales
SET nombre = 'Sede Central'
WHERE nombre ILIKE '%quetzaltenango%'
  AND prefijo_casillero = 'YBG';
