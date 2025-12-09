import { useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ApprovalResponse from './pages/ApprovalResponse';
import SalaryVerification from './pages/SalaryVerification';
import RecommendationResponse from './pages/RecommendationResponse';
import { Loader2 } from 'lucide-react';

function App() {
  // MUST call all hooks at the top (React Rules of Hooks)
  const { user, loading } = useAuth();

  const currentPath = window.location.pathname.replace(/\/$/, '');
  const searchParams = new URLSearchParams(window.location.search);

  // Check for public route tokens/params
  const hasToken = searchParams.has('token');
  const hasApprovalToken = searchParams.has('approval_token');

  // Check for public route paths
  const isVerifyPath = currentPath === '/verify' || currentPath === '/salary-verification';
  const isApprovePath = currentPath === '/approve';
  const isRecommendPath = currentPath === '/recommendation-response';

  console.log('========== APP ROUTER DEBUG ==========');
  console.log('Path:', currentPath);
  console.log('Search:', window.location.search);
  console.log('Has Token:', hasToken, 'Value:', searchParams.get('token'));
  console.log('Has Approval Token:', hasApprovalToken);
  console.log('Is Verify Path:', isVerifyPath);
  console.log('User:', user ? 'Authenticated' : 'Not authenticated');
  console.log('Loading:', loading);
  console.log('======================================');

  // PUBLIC ROUTES - Render immediately, no auth required
  if (hasToken || isVerifyPath) {
    console.log('>>> RENDERING: SalaryVerification (PUBLIC)');
    return <SalaryVerification />;
  }

  if (hasApprovalToken || isApprovePath) {
    console.log('>>> RENDERING: ApprovalResponse (PUBLIC)');
    return <ApprovalResponse />;
  }

  if (isRecommendPath) {
    console.log('>>> RENDERING: RecommendationResponse (PUBLIC)');
    return <RecommendationResponse />;
  }

  // PROTECTED ROUTES - Require authentication
  if (loading) {
    console.log('>>> RENDERING: Loading spinner');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  console.log('>>> RENDERING:', user ? 'Dashboard (PROTECTED)' : 'Auth (LOGIN)');
  return user ? <Dashboard /> : <Auth />;
}

export default App;
