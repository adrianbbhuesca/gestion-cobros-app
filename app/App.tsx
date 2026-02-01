import React, { ErrorInfo, ReactNode, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useUIStore } from '../store/ui.store';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
            <p className="text-gray-500 mb-6 text-sm">
              Se ha producido un error inesperado en la aplicación. Hemos registrado el incidente.
            </p>
            {this.state.error && (
                <div className="bg-gray-100 p-3 rounded text-xs text-left font-mono text-gray-600 mb-6 overflow-auto max-h-32">
                    {this.state.error.message}
                </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-blue-200 shadow-lg active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const { setDeferredPrompt } = useUIStore();

  useEffect(() => {
    const handler = (e: any) => {
      // Prevenir que el navegador muestre el prompt nativo inmediatamente
      e.preventDefault();
      // Guardar el evento para dispararlo después con el botón
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* 
          TECH LEAD NOTE:
          Habilitamos las flags 'future' para eliminar las advertencias de la consola 
          y preparar la app para la migración a React Router v7.
      */}
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRouter />
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;