import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout';
import { Login } from '../auth/Login';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Dashboard } from '../modules/dashboard/Dashboard';
import { RecordForm } from '../modules/records/RecordForm';
import { AdminPanel } from '../modules/admin/AdminPanel';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="records/new" element={<RecordForm />} />
        <Route path="admin" element={
            <ProtectedRoute requireAdmin={true}>
                <AdminPanel />
            </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};