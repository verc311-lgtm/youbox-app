import { Users, Map, Calculator, Bell, Palette } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración del Sistema</h1>
        <p className="text-sm text-slate-500">Administra la arquitectura de datos y preferencias de YOUBOX GT.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
            <Users className="h-5 w-5 text-blue-600 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Jerarquía de Usuarios</h3>
          <p className="mt-2 text-sm text-slate-500">Gestiona roles: Admin, Clientes (Locker), Agentes y Transportistas.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
            <Map className="h-5 w-5 text-indigo-600 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Estructura Geográfica</h3>
          <p className="mt-2 text-sm text-slate-500">Tablas maestras de Países, Regiones, Ciudades y Puertos para rutas.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <Calculator className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Motor de Tarifas</h3>
          <p className="mt-2 text-sm text-slate-500">Configuración de costos por Guías, Warehouse y servicios adicionales.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
            <Bell className="h-5 w-5 text-amber-600 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Notificaciones WhatsApp</h3>
          <p className="mt-2 text-sm text-slate-500">Configura plantillas y alertas automatizadas para clientes.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
            <Palette className="h-5 w-5 text-purple-600 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Personalización y Marca</h3>
          <p className="mt-2 text-sm text-slate-500">Etiquetas térmicas, formatos Excel y despliegues visuales.</p>
        </div>
      </div>
    </div>
  );
}
