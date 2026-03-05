import { Users, Map, Calculator, Bell, Palette } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in relative z-10 w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Configuración del Sistema
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Administra la arquitectura de datos y preferencias de YOUBOX GT.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-blue-200/50">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 relative z-10">Jerarquía de Usuarios</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 relative z-10 leading-relaxed">Gestiona roles: Admin, Clientes (Locker), Agentes y Transportistas.</p>
        </div>

        <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-indigo-200/50">
            <Map className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 relative z-10">Estructura Geográfica</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 relative z-10 leading-relaxed">Tablas maestras de Países, Regiones, Ciudades y Puertos para rutas.</p>
        </div>

        <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-emerald-200/50">
            <Calculator className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 relative z-10">Motor de Tarifas</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 relative z-10 leading-relaxed">Configuración de costos por Guías, Warehouse y servicios adicionales.</p>
        </div>

        <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-amber-200/50">
            <Bell className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 relative z-10">Notificaciones WhatsApp</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 relative z-10 leading-relaxed">Configura plantillas y alertas automatizadas para clientes.</p>
        </div>

        <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-purple-200/50">
            <Palette className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 relative z-10">Personalización y Marca</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 relative z-10 leading-relaxed">Etiquetas térmicas, formatos Excel y despliegues visuales.</p>
        </div>
      </div>
    </div>
  );
}
