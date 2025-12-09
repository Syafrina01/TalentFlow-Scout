import { useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ApprovalResponse from './pages/ApprovalResponse';
import SalaryVerification from './pages/SalaryVerification';
import RecommendationResponse from './pages/RecommendationResponse';
import { Loader2 } from 'lucide-react';

function App() {
  const currentPath = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  const searchParams = new URLSearchParams(window.location.search);
  const hasToken = searchParams.has('token');
  const hasApprovalToken = searchParams.has('approval_token');

  console.log('[App Router] Current path:', currentPath);
  console.log('[App Router] Full URL:', window.location.href);
  console.log('[App Router] Search params:', window.location.search);
  console.log('[App Router] Has token:', hasToken);
  console.log('[App Router] Token value:', searchParams.get('token'));
  console.log('[App Router] Has approval_token:', hasApprovalToken);

  // Check for verification page access
  const isVerificationPath = currentPath === '/verify' || currentPath === '/salary-verification' || currentPath.startsWith('/verify');

  console.log('[App Router] isVerificationPath:', isVerificationPath);
  console.log('[App Router] Should show verification:', hasToken || isVerificationPath);

  if (hasToken || isVerificationPath) {
    console.log('[App Router] ✅ Rendering SalaryVerification page (public access)');
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
