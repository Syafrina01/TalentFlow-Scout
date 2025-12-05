import { useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ApprovalResponse from './pages/ApprovalResponse';
import SalaryVerification from './pages/SalaryVerification';
import RecommendationResponse from './pages/RecommendationResponse';
import { Loader2 } from 'lucide-react';

function App() {
  const currentPath = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const hasToken = searchParams.has('token');
  const hasApprovalToken = searchParams.has('approval_token');

  console.log('[App Router] Current path:', currentPath);
  console.log('[App Router] Search params:', window.location.search);
  console.log('[App Router] Has token:', hasToken);
  console.log('[App Router] Has approval_token:', hasApprovalToken);

  if (hasToken || currentPath === '/verify' || currentPath === '/salary-verification') {
    console.log('[App Router] Rendering SalaryVerification page (public access)');
    return <SalaryVerification />;
  }

  if (hasApprovalToken || currentPath === '/approve') {
    console.log('[App Router] Rendering ApprovalResponse page (public access)');
    return <ApprovalResponse />;
  }

  if (currentPath === '/recommendation-response') {
    console.log('[App Router] Rendering RecommendationResponse page (public access)');
    return <RecommendationResponse />;
  }

  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}

export default App;
