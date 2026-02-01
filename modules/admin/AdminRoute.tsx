import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/user.store';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useUserStore();

  if (loading) return null;

  if (!user || user.role !== 'admin') {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md border border-red-100">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
                <p className="text-gray-500 mb-6">Esta zona es exclusiva para administradores del sistema.</p>
                <Navigate to="/" replace />
            </div>
        </div>
    );
  }

  return <>{children}</>;
};