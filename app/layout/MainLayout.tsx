import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationsBell } from '../../modules/notifications/NotificationsBell';
import { WifiOff, Menu, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';

export const MainLayout: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toggleSidebar, toasts, removeToast } = useUIStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex relative">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-72 p-4 md:p-8 transition-all duration-300">
        <header className="flex justify-between items-center mb-6 md:mb-8 sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md z-20 py-2">
            <div className="flex items-center gap-3">
                <button 
                    onClick={toggleSidebar}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:hidden hover:bg-gray-50 text-gray-700 dark:text-gray-200"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white truncate">Sistema de Gestión</h2>
            </div>
            <NotificationsBell />
        </header>
        
        {!isOnline && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r shadow-sm flex items-center gap-3 animate-fade-in-down">
                <WifiOff className="text-yellow-600 w-5 h-5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-bold text-yellow-700">Sin conexión a Internet</p>
                    <p className="text-xs text-yellow-600">Modo lectura activo. No podrás crear nuevos registros hasta recuperar la conexión.</p>
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[calc(100vh-8rem)] p-4 md:p-6 animate-fade-in">
            <Outlet context={{ isOnline }} />
        </div>
      </main>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
            <div 
                key={toast.id} 
                className={`
                    pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] animate-slide-up
                    ${toast.type === 'success' ? 'bg-green-600' : 
                      toast.type === 'error' ? 'bg-red-600' : 
                      toast.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}
                `}
            >
                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {toast.type === 'error' && <X className="w-5 h-5" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
                
                <p className="text-sm font-medium flex-1">{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} className="opacity-80 hover:opacity-100">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};