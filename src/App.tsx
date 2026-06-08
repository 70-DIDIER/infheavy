import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }      from './context/AuthContext';
import { SmartHomeProvider } from './context/SmartHomeContext';
import { ProtectedRoute }    from './components/ProtectedRoute';
import { Layout }            from './components/layout/Layout';
import { Login }             from './pages/Login';
import { Dashboard }         from './pages/Dashboard';
import { Actionneurs }       from './pages/Actionneurs';
import { Alertes }           from './pages/Alertes';
import { Historique }        from './pages/Historique';
import { Parametres }        from './pages/Parametres';

function AppRoutes() {
  return (
    <SmartHomeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/actionneurs" element={
          <ProtectedRoute roles={['ADMIN','USER']}>
            <Layout><Actionneurs /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/alertes" element={
          <ProtectedRoute>
            <Layout><Alertes /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/historique" element={
          <ProtectedRoute roles={['ADMIN','USER']}>
            <Layout><Historique /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/parametres" element={
          <ProtectedRoute roles={['ADMIN']}>
            <Layout><Parametres /></Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SmartHomeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
