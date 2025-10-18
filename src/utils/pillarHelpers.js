// src/utils/pillarHelpers.js
// Pillar helper functions with 4-character abbreviation support

export const getPillarDisplayName = (pillarId) => {
  const pillarNames = {
    'data_services': 'Data Services',
    'infrastructure': 'Systems & Infrastructure',
    'pmo_ci': 'PMO/CI',
    'risk_governance': 'Risk & Governance',
    'service_support': 'Service & Support'
  };
  return pillarNames[pillarId] || pillarId;
};

export const getPillarAbbreviation = (pillarId) => {
  const pillarAbbreviations = {
    'data_services': 'DASE',
    'infrastructure': 'SYIN',
    'pmo_ci': 'PMCI',
    'risk_governance': 'RIGO',
    'service_support': 'SESU'
  };
  return pillarAbbreviations[pillarId] || pillarId?.toUpperCase().substring(0, 4) || '----';
};

export const getSubPillarDisplayName = (subPillarId) => {
  const subPillarNames = {
    // Data Services Sub-pillars
    'bi_and_i': 'BI & I',
    'devops': 'DevOps',
    'system_analysts': 'System Analysts',
    
    // Systems Infrastructure Sub-pillars
    'network': 'Network',
    'server': 'Server',
    
    // Service & Support Sub-pillars
    'service_desk': 'Service Desk',
    'sd': 'Service Desk'
  };
  return subPillarNames[subPillarId?.toLowerCase()] || subPillarId;
};

export const formatPillarString = (pillarId) => {
  return pillarId
    ?.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || '';
};

export const getTruncatedPillarName = (pillarId) => {
  const truncated = {
    'data_services': 'Data Services',
    'infrastructure': 'Infra & Arch',
    'pmo_ci': 'PMO/CI',
    'risk_governance': 'Risk & Gov',
    'service_support': 'Service & Support'
  };
  return truncated[pillarId] || pillarId;
};