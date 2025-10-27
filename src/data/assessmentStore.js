// src/data/assessmentStore.js

// In-memory store (simulates database)
let assessments = [];

// Initialize with some mock data for testing
const initializeMockData = () => {
  assessments = [
    {
      id: '1x1-1728345600000',
      assessorId: 'isl-001',
      assessorName: 'Marcus Rodriguez',
      assessorRole: 'ISL',
      assesseeId: 'isf-001',
      assesseeName: 'Emily Watson',
      assesseeRole: 'ISF',
      assessmentType: '1x1',
      triggerType: 'scheduled',
      assessmentDate: '2025-09-15',
      completedDate: '2025-09-15T14:30:00Z',
      status: 'completed',
      scores: {
        culture: { contribution: 2, growth: 1 },
        competencies: { contribution: 2, growth: 2 },
        execution: { contribution: 1, growth: 2 }
      },
      composite: 10,
      nineBoxPosition: 'High Impact',
      notes: {
        culture: 'Strong growth mindset and excellent collaboration skills.',
        competencies: 'Technical expertise is outstanding. Leadership emerging.',
        execution: 'Consistently delivers quality results.',
        strengths: 'Technical depth, team player, reliable execution',
        developmentAreas: 'Could take on more strategic initiatives',
        actionItems: 'Lead next quarter infrastructure project'
      }
    },
    {
      id: '1x1-1728259200000',
      assessorId: 'isl-001',
      assessorName: 'Marcus Rodriguez',
      assessorRole: 'ISL',
      assesseeId: 'isf-002',
      assesseeName: 'James Park',
      assesseeRole: 'ISF',
      assessmentType: '1x1',
      triggerType: 'manual',
      assessmentDate: '2025-09-20',
      completedDate: '2025-09-20T10:15:00Z',
      status: 'completed',
      scores: {
        culture: { contribution: 1, growth: 2 },
        competencies: { contribution: 2, growth: 1 },
        execution: { contribution: 2, growth: 1 }
      },
      composite: 9,
      nineBoxPosition: 'Developing Driver',
      notes: {
        culture: 'High potential with room to grow in collaboration.',
        competencies: 'Strong technical skills, solid foundation.',
        execution: 'Delivers well but could improve consistency.',
        strengths: 'Quick learner, takes initiative',
        developmentAreas: 'Cross-team communication, follow-through',
        actionItems: 'Partner with Emily on next data analytics project'
      }
    },
    {
      id: '1x1-1724889600000',
      assessorId: 'isl-001',
      assessorName: 'Marcus Rodriguez',
      assessorRole: 'ISL',
      assesseeId: 'isf-003',
      assesseeName: 'Lisa Johnson',
      assesseeRole: 'ISF',
      assessmentType: '1x1',
      triggerType: 'scheduled',
      assessmentDate: '2025-08-30',
      completedDate: '2025-08-30T16:45:00Z',
      status: 'completed',
      scores: {
        culture: { contribution: 1, growth: 1 },
        competencies: { contribution: 1, growth: 1 },
        execution: { contribution: 1, growth: 1 }
      },
      composite: 6,
      nineBoxPosition: 'Status Quo',
      notes: {
        culture: 'Meets expectations but not stretching beyond current role.',
        competencies: 'Solid baseline skills, needs development.',
        execution: 'Reliable within scope but limited impact.',
        strengths: 'Dependable, follows processes well',
        developmentAreas: 'Initiative, technical depth, strategic thinking',
        actionItems: 'Enroll in advanced security certification course'
      }
    }
  ];
};

// Initialize on load
initializeMockData();

// Save a new assessment
export const saveAssessment = (assessmentData) => {
  const newAssessment = {
    ...assessmentData,
    id: assessmentData.id || `1x1-${Date.now()}`,
    completedDate: assessmentData.completedDate || new Date().toISOString()
  };
  
  assessments.push(newAssessment);
  console.log('✅ Assessment saved:', newAssessment.id);
  return newAssessment;
};

// Get all assessments
export const getAllAssessments = () => {
  return [...assessments];
};

// Get assessments by assessee ID
export const getAssessmentsByAssessee = (assesseeId) => {
  return assessments.filter(a => a.assesseeId === assesseeId);
};

// Get assessments by assessor ID
export const getAssessmentsByAssessor = (assessorId) => {
  return assessments.filter(a => a.assessorId === assessorId);
};

// Get single assessment by ID
export const getAssessmentById = (id) => {
  return assessments.find(a => a.id === id);
};

// Filter assessments
export const filterAssessments = (filters = {}) => {
  let filtered = [...assessments];
  
  if (filters.assesseeId) {
    filtered = filtered.filter(a => a.assesseeId === filters.assesseeId);
  }
  
  if (filters.assessorId) {
    filtered = filtered.filter(a => a.assessorId === filters.assessorId);
  }
  
  if (filters.assessmentType) {
    filtered = filtered.filter(a => a.assessmentType === filters.assessmentType);
  }
  
  if (filters.status) {
    filtered = filtered.filter(a => a.status === filters.status);
  }
  
  if (filters.startDate) {
    filtered = filtered.filter(a => new Date(a.assessmentDate) >= new Date(filters.startDate));
  }
  
  if (filters.endDate) {
    filtered = filtered.filter(a => new Date(a.assessmentDate) <= new Date(filters.endDate));
  }
  
  return filtered;
};

// Reset to initial mock data
export const resetStore = () => {
  initializeMockData();
  console.log('🔄 Assessment store reset to mock data');
};