import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Shield, LogOut, X, DownloadCloud } from 'lucide-react';
import { useUserStore } from '../../store/user.store';
import { useUIStore } from '../../store/ui.store';
import { auth } from '../../services/firebase';

export const Sidebar: React.FC = () => {
  const { user } = useUserStore();
  const { sidebarOpen, setSidebarOpen, deferredPrompt, setDeferredPrompt, addToast } = useUIStore();

  const handleLogout = () => {
    auth.signOut();
    window.location.reload();
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostrar el prompt nativo
    deferredPrompt.prompt();
    
    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        addToast("Instalando aplicación...", 'success');
        setDeferredPrompt(null);
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 hover:pl-5'
    }`;

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
        shadow-2xl lg:shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-blue-500/50">SC</div>
              <h1 className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              Sistema Cobros
              </h1>
          </div>
          <button onClick={closeSidebar} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <div className="mb-6">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Principal</p>
              <NavLink to="/" className={linkClass} onClick={closeSidebar}>
                <LayoutDashboard className="w-5 h-5" />
                Panel General
              </NavLink>
              
              <NavLink to="/records/new" className={linkClass} onClick={closeSidebar}>
                <FilePlus className="w-5 h-5" />
                Nuevo Registro
              </NavLink>
          </div>

          {user?.role === 'admin' && (
            <div>
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Administración</p>
              <NavLink to="/admin" className={linkClass} onClick={closeSidebar}>
                  <Shield className="w-5 h-5" />
                  Control de Usuarios
              </NavLink>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
          {deferredPrompt && (
            <button
                onClick={handleInstallClick}
                className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40 rounded-xl transition-colors active:scale-95"
            >
                <DownloadCloud className="w-4 h-4" />
                Instalar App
            </button>
          )}

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-700" />
              ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                      {user?.displayName?.charAt(0)}
                  </div>
              )}
              <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${user?.role === 'admin' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></span>
                      <p className="text-xs text-gray-500 truncate capitalize font-medium">{user?.role}</p>
                  </div>
              </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
};