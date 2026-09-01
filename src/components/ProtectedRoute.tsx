import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardSkeleton } from './ui/Skeleton';

const ROLE_HIERARCHY: Record<string, string[]> = {
  'funcionario':    ['funcionario', 'operador', 'monitor', 'coordenador', 'administrador'],
  'operador':       ['operador', 'coordenador', 'administrador'],
  'monitor':        ['monitor', 'coordenador', 'administrador'],
  'coordenador':    ['coordenador', 'administrador'],
  'administrador':  ['administrador']
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredRole?: string;
}

export function ProtectedRoute({ children, allowedRoles, requiredRole }: ProtectedRouteProps) {
  const { user, loading, userData } = useAuth();
  const location = useLocation();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location, message: 'Faça login para continuar' }} replace />;
  }

  let effectiveRoles: string[] | undefined;
  
  if (allowedRoles) {
    effectiveRoles = allowedRoles;
  } else if (requiredRole) {
    effectiveRoles = ROLE_HIERARCHY[requiredRole];
  }
  
  if (effectiveRoles && userData && !effectiveRoles.includes(userData.perfil)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;