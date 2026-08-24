import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { PublicAuthProvider } from './contexts/PublicAuthContext';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Pages
import Dashboard from './components/pages/Dashboard';
import Visitors from './components/pages/Visitors';
import Lockers from './components/pages/Lockers';
import Telecentro from './components/pages/Telecentro';
import Agendamento from './components/pages/Agendamento';
import AgendamentoPublico from './components/pages/AgendamentoPublico';
import Reports from './components/pages/Reports';
import SettingsPage from './components/pages/Settings';
import Login from './components/pages/Login';
import LoginPublico from './components/pages/LoginPublico';
import CadastroPublico from './components/pages/CadastroPublico';
import TermoCompromisso from './components/pages/TermoCompromisso';

// Components
import CheckInModal from './components/modals/CheckInModal';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

function InternalRoutes({ onNewCheckIn }: { onNewCheckIn: () => void }) {
  const { userData } = useAuth();

  useEffect(() => {
    if (userData) {
      if (userData.espacoId === 'todos' || !userData.espacoId) {
        document.title = 'GVC - Gestão Cultural';
      } else if (userData.espacoNome) {
        document.title = `GVC - ${userData.espacoNome}`;
      } else {
        document.title = 'GVC';
      }
    } else {
      document.title = 'GVC';
    }
  }, [userData]);

  return (
    <div className="min-h-screen bg-surface font-sans selection:bg-primary/10 selection:text-primary">
      <Sidebar onNewCheckIn={onNewCheckIn} />
      <div className="pl-72">
        <Header />
        <main className="pt-16 min-h-[calc(100vh-64px)] relative">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/visitors" element={<ProtectedRoute><Visitors /></ProtectedRoute>} />
              <Route path="/lockers" element={<ProtectedRoute><Lockers /></ProtectedRoute>} />
              <Route path="/telecentro" element={<ProtectedRoute><Telecentro /></ProtectedRoute>} />
              <Route path="/agendamento" element={<ProtectedRoute><Agendamento /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requiredRole="coordenador"><Reports /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute requiredRole="administrador"><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const { user, loading, isSuperadmin, isCitizen } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Iniciando GVC...</p>
        </div>
      </div>
    );
  }

  const isPublicUser = !user || isCitizen;

  if (isPublicUser && !isSuperadmin) {
    return (
      <PublicAuthProvider>
        <Router>
          <Routes>
            <Route path="/gerenciamento" element={<Login />} />
            <Route path="/login" element={<Navigate to="/gerenciamento" replace />} />
            <Route path="/agendamento" element={<LoginPublico />} />
            <Route path="/login-publico" element={<Navigate to="/agendamento" replace />} />
            <Route path="/agendamento/cadastro" element={<CadastroPublico />} />
            <Route path="/cadastro-publico" element={<Navigate to="/agendamento/cadastro" replace />} />
            <Route path="/agendamento/formulario" element={<AgendamentoPublico />} />
            <Route path="/agendamento-publico" element={<Navigate to="/agendamento/formulario" replace />} />
            <Route path="/agendamento/termo" element={<TermoCompromisso />} />
            <Route path="/termo-compromisso" element={<Navigate to="/agendamento/termo" replace />} />
            <Route path="/" element={<Navigate to="/gerenciamento" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </PublicAuthProvider>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <InternalRoutes onNewCheckIn={() => setIsCheckInOpen(true)} />
        <CheckInModal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} />
      </Router>
    </ErrorBoundary>
  );
}
