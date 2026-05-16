-- Migration: Add sucursal_id to consolidaciones
-- Description: Adds a branch reference to consolidaciones to allow filtering by branch.

ALTER TABLE consolidaciones 
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;

COMMENT ON COLUMN consolidaciones.sucursal_id IS 'Sede a la que pertenece o se asigna este consolidado (para filtros y control visual)';
