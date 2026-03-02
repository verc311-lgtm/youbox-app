import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Search, Calculator, FileUp, Navigation, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  // Dummy data for now if we don't have this in the DB yet
  const planData = {
    name: "Premium anual",
    usedLbs: 20,
    availableLbs: 40,
    expirationDate: "20/12/2026"
  };

  const handeComingSoon = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full max-w-md mx-auto bg-[#e5252b] overflow-hidden flex flex-col font-sans">
      {/* Red Background Container */}
      
      {/* White Phone-like Container Area */}
      <div className="flex-1 bg-white rounded-t-[2.5rem] mt-6 flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Top Header Section */}
        <div className="pt-8 px-6 pb-4">
          <h1 className="text-2xl font-bold text-slate-800">
            ¡Hola! <span className="text-blue-700">{user?.nombre || 'Usuario'}</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Tu código: <span className="font-bold text-slate-700">{user?.locker_id || 'YBG000'}</span>
          </p>
        </div>

        {/* Plan Summary Card (Floating/Overlapping feel) */}
        <div className="mx-6 bg-blue-800 rounded-xl p-5 text-white shadow-lg relative z-10">
          <h2 className="text-base font-bold mb-3 border-b border-blue-700/50 pb-2">
            Resumen de tu plan
          </h2>
          <div className="space-y-1.5 text-sm text-blue-100">
            <p><span className="font-medium mr-1">Plan:</span> {planData.name}</p>
            <p><span className="font-medium mr-1">Libras utilizadas:</span> {planData.usedLbs}lbs</p>
            <p><span className="font-medium mr-1">Libras disponibles:</span> {planData.availableLbs}lbs</p>
            <p><span className="font-medium mr-1">Fecha de vencimiento:</span> {planData.expirationDate}</p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4 px-6 mt-8 relative z-10">
          
          {/* Rastrear */}
          <button 
            onClick={() => navigate('/tracking')}
            className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-95 group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Search className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-600">Rastrear</span>
          </button>

          {/* Pre Alertar (Próximamente) */}
          <button 
            onClick={handeComingSoon}
            className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-95 group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileUp className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-600">Pre alertar</span>
          </button>

          {/* Cotizar (Próximamente) */}
          <button 
            onClick={handeComingSoon}
            className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-95 group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calculator className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-600">Cotizar</span>
          </button>

          {/* Tus Paquetes */}
          <button 
            onClick={() => navigate('/inventory')}
            className="bg-blue-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg hover:bg-blue-900 transition-all active:scale-95 relative group"
          >
            <div className="absolute -top-2 -right-2 bg-[#e5252b] text-white text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
              3
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-700/50 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-white">Tus paquetes</span>
          </button>

        </div>

        {/* Botón Tu Dirección Miami */}
        <div className="px-6 mt-8 mb-8 relative z-10 w-full flex justify-center">
          <button 
            className="w-full bg-[#e5252b] hover:bg-red-700 text-white rounded-xl py-3.5 px-4 font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95"
            onClick={() => navigate('/profile')} // Assuming Tu dirección is shown in profile/settings
          >
            TU DIRECCIÓN EN MIAMI
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Bottom Red Banner Area */}
      <div className="bg-[#e5252b] pt-8 pb-12 px-8 flex items-end justify-end relative h-48 overflow-hidden">
        {/* Decorative Box Icon Background */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-20">
          <Package className="h-32 w-32 text-white/50" strokeWidth={1} />
        </div>
        
        <h2 className="text-right text-white font-black text-2xl uppercase leading-tight max-w-[200px] z-10 opacity-90">
          Control de tu cuenta en la palma de tu mano
        </h2>
      </div>

      {/* Coming Soon Toast Notification */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 ${showComingSoon ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="text-sm font-medium">Esta función estará disponible pronto 👀</span>
        <button onClick={() => setShowComingSoon(false)} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
