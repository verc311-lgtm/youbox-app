import React, { useState } from 'react';
import { useAuth, YOUBOX_ADDRESSES } from '../context/AuthContext';
import { Package, Search, Calculator, FileUp, ChevronRight, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PreAlertModal } from '../components/PreAlertModal';

export function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [showPreAlertModal, setShowPreAlertModal] = useState(false);

  const handeComingSoon = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full max-w-md mx-auto bg-slate-50 flex flex-col font-sans">

      <div className="flex-1 flex flex-col relative py-8">

        {/* Top Header Section */}
        <div className="px-6 pb-6">
          <h1 className="text-3xl font-bold text-slate-800">
            ¡Hola! <span className="text-blue-700">{user?.nombre || 'Usuario'}</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Tu código: <span className="font-bold text-slate-700 text-lg">{user?.locker_id || 'YBG000'}</span>
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4 px-6 mt-2 relative z-10">

          {/* Rastrear */}
          <button
            onClick={() => navigate('/tracking')}
            className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-95 group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Search className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Rastrear</span>
          </button>

          {/* Pre Alertar */}
          <button
            onClick={() => setShowPreAlertModal(true)}
            className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-95 group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileUp className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Pre alertar</span>
          </button>

          {/* Cotizar (Próximamente) */}
          <button
            onClick={handeComingSoon}
            className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all active:scale-95 group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calculator className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Cotizar</span>
          </button>

          {/* Tus Paquetes */}
          <button
            onClick={() => navigate('/inventory')}
            className="bg-blue-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg hover:bg-blue-900 transition-all active:scale-95 relative group"
          >
            <div className="h-12 w-12 rounded-full bg-blue-700/50 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-white">Tus paquetes</span>
          </button>

        </div>

        {/* Botón Tus Direcciones Disponibles */}
        <div className="px-6 mt-8 relative z-10 w-full flex justify-center">
          <button
            className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-4 px-4 font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95"
            onClick={() => setShowAddresses(true)}
          >
            TUS DIRECCIONES DISPONIBLES
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Coming Soon Toast Notification */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 ${showComingSoon ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="text-sm font-medium">Esta función estará disponible pronto 👀</span>
        <button onClick={() => setShowComingSoon(false)} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Addresses Modal */}
      {showAddresses && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Nuestras Bodegas
              </h3>
              <button
                onClick={() => setShowAddresses(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 bg-slate-50">
              {Object.entries(YOUBOX_ADDRESSES).map(([key, addr]) => (
                <div key={key} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h4 className="font-bold text-sm text-slate-800 mb-3 text-blue-800">{addr.titulo}</h4>
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-700">Nombre:</span> {addr.nombre}</p>
                    <p><span className="font-semibold text-slate-700">Dirección:</span> {addr.direccion}</p>
                    {addr.suiteApt && <p><span className="font-semibold text-slate-700">Suite/Apt:</span> {addr.suiteApt.replace('{CASILLERO}', user?.locker_id || 'YBG000')}</p>}
                    {addr.referencias && <p><span className="font-semibold text-slate-700">Referencias:</span> {addr.referencias.replace('{CASILLERO}', user?.locker_id || 'YBG000')}</p>}
                    <p><span className="font-semibold text-slate-700">Ciudad:</span> {addr.ciudad}</p>
                    {addr.estado && <p><span className="font-semibold text-slate-700">Estado:</span> {addr.estado}</p>}
                    {addr.zipCode && <p><span className="font-semibold text-slate-700">ZIP:</span> {addr.zipCode}</p>}
                    {addr.codPostal && <p><span className="font-semibold text-slate-700">CP:</span> {addr.codPostal}</p>}
                    <p><span className="font-semibold text-slate-700">Tel:</span> {addr.telefono}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pre-Alert Modal */}
      <PreAlertModal
        isOpen={showPreAlertModal}
        onClose={() => setShowPreAlertModal(false)}
      />
    </div>
  );
}
