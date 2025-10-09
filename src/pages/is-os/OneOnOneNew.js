import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, User, Save, Clock, FileText, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AssessmentGrid from '../../components/AssessmentGrid';
import { useAuth } from '../../contexts/AuthContext';
import { saveAssessment } from '../../data/assessmentStore';

// Mock team data - replace with real API
const mockTeamMembers = {
  'isf-001': { id: 'isf-001', name: 'Emily Watson', role: 'ISF', team: 'Data Analytics' },
  'isf-002': { id: 'isf-002', name: 'James Park', role: 'ISF', team: 'Infrastructure' },
  'isf-003': { id: 'isf-003', name: 'Lisa Johnson', role: 'ISF', team: 'Security' },
  'isf-004': { id: 'isf-004', name: 'Ahmed Hassan', role: 'ISF', team: 'Cloud Services' },
  'isf-005': { id: 'isf-005', name: 'Maria Garcia', role: 'ISF', team: 'Data Analytics' }
};

function OneOnOneNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assesseeId = searchParams.get('assessee');

  // Get assessee info from URL param
  const assessee = mockTeamMembers[assesseeId] || mockTeamMembers['isf-001'];

  // Assessment metadata
  const [assessmentMeta] = useState({
    assessorId: user.id || 'isl-001',
    assessorName: user.name || 'Current User',
    assessorRole: user.role || 'ISL',
    assesseeId: assessee.id,
    assesseeName: assessee.name,
    assesseeRole: assessee.role,
    assessmentType: '1x1',
    assessmentDate: new Date().toISOString().split('T')[0],
    triggerType: 'manual',
    status: 'in-progress'
  });

  // MSH³ Scores using the NEW Firebase structure
  const [scores, setScores] = useState({
    pillar_001: {
      subPillar_001: 1, // Strategic Thinking
      subPillar_002: 1, // Decision Making
      subPillar_003: 1  // Team Development
    },
    pillar_002: {
      subPillar_004: 1, // Clarity
      subPillar_005: 1, // Listening
      subPillar_006: 1  // Feedback
    }
  });

  // Notes for each pillar + overall
  const [notes, setNotes] = useState({
    leadership: '',
    communication: '',
    strengths: '',
    developmentAreas: '',
    actionItems: ''
  });

  const handleScoreChange = (pillar, subPillar, value) => {
    setScores(prev => ({
      ...prev,
      [pillar]: {
        ...prev[pillar],
        [subPillar]: parseInt(value)
      }
    }));
  };

  const handleNoteChange = (field, value) => {
    setNotes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateComposite = () => {
    return scores.pillar_001.subPillar_001 + scores.pillar_001.subPillar_002 + scores.pillar_001.subPillar_003 +
           scores.pillar_002.subPillar_004 + scores.pillar_002.subPillar_005 + scores.pillar_002.subPillar_006;
  };

  const calculateNineBoxPosition = () => {
    const totalContribution = scores.pillar_001.subPillar_001 + scores.pillar_001.subPillar_002 + scores.pillar_001.subPillar_003;
    const totalGrowth = scores.pillar_002.subPillar_004 + scores.pillar_002.subPillar_005 + scores.pillar_002.subPillar_006;
    const composite = totalContribution + totalGrowth;

    let growthLevel, contribLevel;
    
    if (totalContribution <= 2) contribLevel = 'low';
    else if (totalContribution <= 4) contribLevel = 'mid';
    else contribLevel = 'high';
    
    if (totalGrowth <= 2) growthLevel = 'low';
    else if (totalGrowth <= 4) growthLevel = 'mid';
    else growthLevel = 'high';

    if (composite >= 11 && growthLevel === 'high' && contribLevel === 'high') return 'Transformative Outcomes';
    
    if (growthLevel === 'high' && contribLevel === 'low') return 'Raw Talent';
    if (growthLevel === 'high' && contribLevel === 'mid') return 'High Impact';
    if (growthLevel === 'high' && contribLevel === 'high') return 'High Impact';
    
    if (growthLevel === 'mid' && contribLevel === 'low') return 'Narrow Contributor';
    if (growthLevel === 'mid' && contribLevel === 'mid') return 'Status Quo';
    if (growthLevel === 'mid' && contribLevel === 'high') return 'Developing Driver';
    
    if (growthLevel === 'low' && contribLevel === 'low') return 'Critical Risk';
    if (growthLevel === 'low' && contribLevel === 'mid') return 'Inconsistent';
    if (growthLevel === 'low' && contribLevel === 'high') return 'Untapped Potential';
    
    return 'Status Quo';
  };

  const handlePublish = () => {
    const composite = calculateComposite();
    const nineBoxPosition = calculateNineBoxPosition();
    
    const assessmentData = {
      ...assessmentMeta,
      scores,
      notes,
      composite,
      nineBoxPosition,
      status: 'completed',
      completedDate: new Date().toISOString()
    };
    
    // Save to store
    const savedAssessment = saveAssessment(assessmentData);
    
    console.log('✅ Assessment Published:', savedAssessment);
    
    // Navigate to history page
    navigate('/is-os/assessments/history', { 
      state: { message: 'Assessment published successfully!' }
    });
  };

  const handleSaveDraft = () => {
    const composite = calculateComposite();
    const nineBoxPosition = calculateNineBoxPosition();
    
    const draftData = {
      ...assessmentMeta,
      scores,
      notes,
      composite,
      nineBoxPosition,
      status: 'draft',
      savedDate: new Date().toISOString()
    };
    
    console.log('💾 Draft Saved:', draftData);
    alert('Draft saved! (This would save to backend in production)');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">ISF ↔ ISL 1x1 Assessment</h1>
              </div>
              <p className="text-gray-600">Monthly performance assessment between ISL and ISF team members</p>
            </div>
            <Badge variant={assessmentMeta.status === 'completed' ? 'success' : 'warning'}>
              {assessmentMeta.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-gray-600">Assessor:</span>
                <p className="font-semibold text-gray-900">{assessmentMeta.assessorName}</p>
                <Badge variant="info" className="text-xs mt-1">{assessmentMeta.assessorRole}</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-gray-600">Assessee:</span>
                <p className="font-semibold text-gray-900">{assessmentMeta.assesseeName}</p>
                <Badge variant="secondary" className="text-xs mt-1">{assessmentMeta.assesseeRole}</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-semibold text-gray-900">{assessmentMeta.assessmentDate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-gray-600">Trigger:</span>
                <Badge variant={assessmentMeta.triggerType === 'manual' ? 'warning' : 'success'} className="mt-1">
                  {assessmentMeta.triggerType}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* AssessmentGrid Component */}
        <AssessmentGrid 
          scores={scores}
          onScoreChange={handleScoreChange}
        />

        {/* Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <Card borderColor="msh-blue">
            <h3 className="text-base font-bold text-neutral-dark mb-3">Leadership Notes</h3>
            <textarea
              placeholder="Strategic thinking, decision making, team development..."
              value={notes.leadership}
              onChange={(e) => handleNoteChange('leadership', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="4"
            />
          </Card>

          <Card borderColor="msh-purple">
            <h3 className="text-base font-bold text-neutral-dark mb-3">Communication Notes</h3>
            <textarea
              placeholder="Clarity, listening skills, feedback delivery..."
              value={notes.communication}
              onChange={(e) => handleNoteChange('communication', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows="4"
            />
          </Card>
        </div>

        {/* Additional Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          <Card>
            <h3 className="text-base font-bold text-neutral-dark mb-3">Key Strengths</h3>
            <textarea
              placeholder="What are they excelling at?"
              value={notes.strengths}
              onChange={(e) => handleNoteChange('strengths', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="3"
            />
          </Card>

          <Card>
            <h3 className="text-base font-bold text-neutral-dark mb-3">Development Areas</h3>
            <textarea
              placeholder="Where do they need to grow?"
              value={notes.developmentAreas}
              onChange={(e) => handleNoteChange('developmentAreas', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows="3"
            />
          </Card>

          <Card>
            <h3 className="text-base font-bold text-neutral-dark mb-3">Action Items</h3>
            <textarea
              placeholder="Next steps and commitments..."
              value={notes.actionItems}
              onChange={(e) => handleNoteChange('actionItems', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows="3"
            />
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <Button
            variant="primary"
            onClick={handlePublish}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Save className="w-5 h-5 mr-2" />
            Publish Assessment
          </Button>
          
          <Button 
            variant="secondary" 
            className="px-8"
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>

          <Button 
            variant="ghost" 
            className="px-8"
            onClick={() => navigate('/is-os')}
          >
            Cancel
          </Button>
        </div>

      </div>
    </div>
  );
}

export default OneOnOneNew;