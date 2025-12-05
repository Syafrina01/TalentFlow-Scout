import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

export default function RecommendationResponse() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<any>(null);
  const [token, setToken] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    relationship: '',
    feedback: '',
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (!tokenParam) {
      setError('Invalid recommendation link');
      setLoading(false);
      return;
    }

    setToken(tokenParam);
    fetchRecommendationInfo(tokenParam);
  }, []);

  const fetchRecommendationInfo = async (token: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-recommendation?token=${token}`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load recommendation info');
      }

      setCandidateInfo(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendation info');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.relationship.trim() || !formData.feedback.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-recommendation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            ...formData,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit recommendation');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading recommendation request...</p>
        </div>
      </div>
    );
  }

  if (error && !candidateInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your recommendation has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-cyan-600" />
          <h1 className="text-2xl font-bold text-gray-900">Provide Recommendation</h1>
        </div>

        {candidateInfo && (
          <div className="bg-cyan-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">Candidate Information</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {candidateInfo.candidateName}</p>
              <p><strong>Position:</strong> {candidateInfo.positionApplied}</p>
              <p className="text-xs text-gray-500 mt-2">
                Recommendation #{candidateInfo.recommendationNumber}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization/Company
            </label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Enter your organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship to Candidate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="e.g., Former Manager, Colleague, Professor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Recommendation <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Please provide your recommendation and comments about the candidate's qualifications, skills, work ethic, and character..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Please provide detailed feedback about the candidate's strengths and suitability for the role.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-600 text-white py-3 rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Recommendation'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
