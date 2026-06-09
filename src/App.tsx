import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }      from './context/AuthContext';
import { SmartHomeProvider } from './context/SmartHomeContext';
import { ProtectedRoute }    from './components/ProtectedRoute';
import { Layout }            from './components/layout/Layout';
import { Login }             from './pages/Login';
import { Register }          from './pages/Register';
import { VerifyEmail }       from './pages/VerifyEmail';
import { ForgotPassword }    from './pages/ForgotPassword';
import { ResetPassword }     from './pages/ResetPassword';
import { AcceptInvite }      from './pages/AcceptInvite';
import { Dashboard }         from './pages/Dashboard';
import { Alertes }           from './pages/Alertes';
import { Historique }        from './pages/Historique';
import { Parametres }        from './pages/Parametres';
import { Appareils }         from './pages/Appareils';
import { Automations }       from './pages/Automations';
import { Zones }             from './pages/Zones';
import { Energie }           from './pages/Energie';
import { Disponibilite }     from './pages/Disponibilite';
import { Cameras }           from './pages/Cameras';
import { Voix }             from './pages/Voix';

function AppRoutes() {
  return (
    <SmartHomeProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login"            element={<Login />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/accept-invite"    element={<AcceptInvite />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/actionneurs" element={<Navigate to="/appareils" replace />} />
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
        <Route path="/appareils" element={
          <ProtectedRoute>
            <Layout><Appareils /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/automations" element={
          <ProtectedRoute roles={['ADMIN','USER']}>
            <Layout><Automations /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/energie" element={
          <ProtectedRoute roles={['ADMIN','USER']}>
            <Layout><Energie /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/disponibilite" element={
          <ProtectedRoute roles={['ADMIN','USER']}>
            <Layout><Disponibilite /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/cameras" element={
          <ProtectedRoute>
            <Layout><Cameras /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/voix" element={
          <ProtectedRoute>
            <Layout><Voix /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/zones" element={
          <ProtectedRoute roles={['ADMIN']}>
            <Layout><Zones /></Layout>
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
