// 📁 SAVE TO: src/pages/is-os/MSHDetailView.jsx
// ✅ NEW: MSH detail view - shows published MSH score card

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, Award, Calendar, User, CheckCircle, AlertCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

function MSHDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [msh, setMsh] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMshScore();
  }, [id]);

  const fetchMshScore = async () => {
    try {
      setLoading(true);
      
      const mshRef = doc(db, 'mshScores', id);
      const mshSnap = await getDoc(mshRef);
      
      if (!mshSnap.exists()) {
        alert('MSH score not found');
        navigate('/is-os/assessments/history');
        return;
      }
      
      const data = mshSnap.data();
      setMsh({
        id: mshSnap.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.() || null
      });
    } catch (error) {
      console.error('Error fetching MSH:', error);
      alert('Error loading MSH: ' + error.message);
      navigate('/is-os/assessments/history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MSH score...</p>
        </div>
      </div>
    );
  }

  if (!msh) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">MSH score not found</p>
          <button
            onClick={() => navigate('/is-os/assessments/history')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/is-os/assessments/history')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to History
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-8 h-8" />
                <h1 className="text-3xl font-bold">{msh.mshId}</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {msh.mshType === '360' ? '360° MSH' : '1x1 MSH'}
                </Badge>
              </div>
              <p className="text-blue-100 text-lg">{msh.subjectName}</p>
            </div>
            
            <div className="text-right">
              <div className="text-6xl font-bold mb-1">{msh.composite || 0}</div>
              <div className="text-blue-100 text-sm">Composite Score / 12</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <Card>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Nine-Box Position</div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {msh.nineBoxPosition || 'N/A'}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Alignment Status</div>
              {msh.alignment === 'aligned' ? (
                <Badge variant="success" className="text-lg px-4 py-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Aligned
                </Badge>
              ) : (
                <Badge variant="warning" className="text-lg px-4 py-2">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Not Aligned
                </Badge>
              )}
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Published</div>
              <div className="text-lg font-semibold text-gray-900">
                {msh.publishedAt?.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </Card>

        </div>

        {/* Dimension Scores Grid */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dimension Scores</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            
            <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
              <div className="text-xs font-bold text-purple-900 uppercase mb-2">Culture</div>
              <div className="text-4xl font-bold text-purple-700">{msh.scores?.culture || 0}</div>
              <div className="text-xs text-purple-600 mt-1">Contribution</div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
              <div className="text-xs font-bold text-purple-900 uppercase mb-2">Mindset</div>
              <div className="text-4xl font-bold text-purple-700">{msh.scores?.mindset || 0}</div>
              <div className="text-xs text-purple-600 mt-1">Growth</div>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg border-2 border-orange-200">
              <div className="text-xs font-bold text-orange-900 uppercase mb-2">Competencies</div>
              <div className="text-4xl font-bold text-orange-700">{msh.scores?.competencies || 0}</div>
              <div className="text-xs text-orange-600 mt-1">Contribution</div>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg border-2 border-orange-200">
              <div className="text-xs font-bold text-orange-900 uppercase mb-2">Skillset</div>
              <div className="text-4xl font-bold text-orange-700">{msh.scores?.skillset || 0}</div>
              <div className="text-xs text-orange-600 mt-1">Growth</div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="text-xs font-bold text-green-900 uppercase mb-2">Execution</div>
              <div className="text-4xl font-bold text-green-700">{msh.scores?.execution || 0}</div>
              <div className="text-xs text-green-600 mt-1">Contribution</div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="text-xs font-bold text-green-900 uppercase mb-2">Habits</div>
              <div className="text-4xl font-bold text-green-700">{msh.scores?.habits || 0}</div>
              <div className="text-xs text-green-600 mt-1">Growth</div>
            </div>

          </div>
        </Card>

        {/* MSH Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">MSH Type</span>
                <Badge variant="secondary">{msh.mshType === '360' ? '360°' : '1x1'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subject</span>
                <span className="font-semibold text-gray-900">{msh.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cycle</span>
                <span className="font-semibold text-gray-900">{msh.cycleName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cycle Period</span>
                <span className="font-semibold text-gray-900">
                  {msh.cycleMonth ? `${msh.cycleMonth}/${msh.cycleYear}` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Publishing Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Published By</span>
                <span className="font-semibold text-gray-900">{msh.assessorName || 'System'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Published Date</span>
                <span className="font-semibold text-gray-900">
                  {msh.publishedAt?.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">HRP Review</span>
                {msh.hrpReviewRequested ? (
                  <Badge variant="warning" className="text-xs">Requested</Badge>
                ) : (
                  <span className="text-gray-400">Not Requested</span>
                )}
              </div>
            </div>
          </Card>

        </div>

        {/* Source Assessments Info (for 360° MSH) */}
        {msh.mshType === '360' && msh.sourceAssessments && (
          <Card className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Source Assessments</h3>
            <div className="space-y-2 text-sm">
              {msh.sourceAssessments.self && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">Self-Assessment ID:</span>
                  <span className="font-mono text-gray-900">{msh.sourceAssessments.self}</span>
                </div>
              )}
              {msh.sourceAssessments.bilateral && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Bilateral Assessment ID:</span>
                  <span className="font-mono text-gray-900">{msh.sourceAssessments.bilateral}</span>
                </div>
              )}
              {msh.sourceAssessments.pairId && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span className="text-gray-600">Pairing ID:</span>
                  <span className="font-mono text-gray-900">{msh.sourceAssessments.pairId}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 1x1 Source Assessment Info */}
        {msh.mshType === '1x1' && msh.sourceAssessmentIds && (
          <Card className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Source Assessment</h3>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Assessment ID:</span>
              <span className="font-mono text-gray-900">{msh.sourceAssessmentIds[0]}</span>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

export default MSHDetailView;