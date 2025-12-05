import { useState } from 'react';
import { Mail, CheckCircle, Clock, XCircle, Send, RotateCcw } from 'lucide-react';
import { sendRecommendationRequest } from '../../services/recommendationService';
import { getPublicBaseUrl } from '../../utils/urlHelper';

interface RecommendationSectionProps {
  candidate: any;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function RecommendationSection({ candidate, onSuccess, onError }: RecommendationSectionProps) {
  const [showRecommendation1Form, setShowRecommendation1Form] = useState(false);
  const [showRecommendation2Form, setShowRecommendation2Form] = useState(false);
  const [recommendation1Email, setRecommendation1Email] = useState('');
  const [recommendation2Email, setRecommendation2Email] = useState('');
  const [sending, setSending] = useState<1 | 2 | null>(null);

  const handleSendRecommendationRequest = async (recommendationNumber: 1 | 2) => {
    const email = recommendationNumber === 1 ? recommendation1Email : recommendation2Email;

    if (!email.trim()) {
      onError('Please enter an email address');
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      onError('Please enter a valid email address');
      return;
    }

    setSending(recommendationNumber);

    try {
      const recommendationUrl = await sendRecommendationRequest({
        candidateId: candidate.candidate_id,
        recommendationNumber,
        recommenderEmail: email,
      });

      const baseUrl = getPublicBaseUrl();
      const subject = `Recommendation Request - ${candidate.name} (${candidate.position})`;
      const body = `Hello,\n\nYou have been requested to provide a recommendation for ${candidate.name}, who has applied for the position of ${candidate.position}.\n\nPlease click the link below to submit your recommendation:\n${recommendationUrl}\n\nThis link will expire in 30 days.\n\nThank you!`;

      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');

      if (recommendationNumber === 1) {
        setShowRecommendation1Form(false);
        setRecommendation1Email('');
      } else {
        setShowRecommendation2Form(false);
        setRecommendation2Email('');
      }

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to send recommendation request');
    } finally {
      setSending(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1 text-amber-700">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Pending</span>
          </div>
        );
      case 'declined':
        return (
          <div className="flex items-center gap-1 text-red-700">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Declined</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Not Requested</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-600" />
        Reference Recommendations
      </h4>

      <div className="space-y-4">
        {/* Recommendation 1 */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Recommendation 1</span>
              <span className="text-xs text-red-500">(Required)</span>
            </div>
            {getStatusBadge(candidate.recommendation1_status)}
          </div>

          {candidate.recommendation1_email && (
            <div className="text-sm text-slate-600 mb-2">
              <span className="font-medium">Email:</span> {candidate.recommendation1_email}
            </div>
          )}

          {candidate.recommendation1_name && (
            <div className="text-sm text-slate-600 mb-2">
              <span className="font-medium">Name:</span> {candidate.recommendation1_name}
              {candidate.recommendation1_organization && ` (${candidate.recommendation1_organization})`}
            </div>
          )}

          {candidate.recommendation1_feedback && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded p-2 mb-2">
              <span className="font-medium">Feedback:</span>
              <p className="mt-1">{candidate.recommendation1_feedback}</p>
            </div>
          )}

          {candidate.recommendation1_status !== 'completed' && (
            <>
              {showRecommendation1Form ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="email"
                    placeholder="Enter recommender's email"
                    value={recommendation1Email}
                    onChange={(e) => setRecommendation1Email(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendRecommendationRequest(1)}
                      disabled={sending === 1}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sending === 1 ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Request
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowRecommendation1Form(false);
                        setRecommendation1Email('');
                      }}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRecommendation1Form(true)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {candidate.recommendation1_status === 'pending' ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Resend Request
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Request Recommendation
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Recommendation 2 */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Recommendation 2</span>
              <span className="text-xs text-gray-500">(Optional)</span>
            </div>
            {getStatusBadge(candidate.recommendation2_status)}
          </div>

          {candidate.recommendation2_email && (
            <div className="text-sm text-slate-600 mb-2">
              <span className="font-medium">Email:</span> {candidate.recommendation2_email}
            </div>
          )}

          {candidate.recommendation2_name && (
            <div className="text-sm text-slate-600 mb-2">
              <span className="font-medium">Name:</span> {candidate.recommendation2_name}
              {candidate.recommendation2_organization && ` (${candidate.recommendation2_organization})`}
            </div>
          )}

          {candidate.recommendation2_feedback && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded p-2 mb-2">
              <span className="font-medium">Feedback:</span>
              <p className="mt-1">{candidate.recommendation2_feedback}</p>
            </div>
          )}

          {candidate.recommendation2_status !== 'completed' && (
            <>
              {showRecommendation2Form ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="email"
                    placeholder="Enter recommender's email"
                    value={recommendation2Email}
                    onChange={(e) => setRecommendation2Email(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendRecommendationRequest(2)}
                      disabled={sending === 2}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sending === 2 ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Request
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowRecommendation2Form(false);
                        setRecommendation2Email('');
                      }}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRecommendation2Form(true)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {candidate.recommendation2_status === 'pending' ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Resend Request
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Request Recommendation
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
