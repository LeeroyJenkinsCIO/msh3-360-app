import React from 'react';

const AssessmentGrid = ({ scores, onSliderChange, titlePrefix = "My" }) => {
  
  const calculateNineBoxPosition = (scores) => {
    const totalContribution = scores.culture.contribution + scores.competencies.contribution + scores.execution.contribution;
    const totalGrowth = scores.culture.growth + scores.competencies.growth + scores.execution.growth;
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

  const totalContribution = scores.culture.contribution + scores.competencies.contribution + scores.execution.contribution;
  const totalGrowth = scores.culture.growth + scores.competencies.growth + scores.execution.growth;
  const composite = totalContribution + totalGrowth;
  const position = calculateNineBoxPosition(scores);

  const getPositionDescription = (position) => {
    const descriptions = {
      'Critical Risk': {
        zone: 'Below Baseline (0-4): Coaching and Support Zone',
        color: 'text-red-700',
        description: 'Immediate intervention required; both growth and contribution are below expectations.'
      },
      'Narrow Contributor': {
        zone: 'Below Baseline (0-4): Coaching and Support Zone',
        color: 'text-red-700',
        description: 'Performs reliably within a limited scope; limited adaptability outside familiar territory.'
      },
      'Inconsistent': {
        zone: 'Below Baseline (0-4): Coaching and Support Zone',
        color: 'text-red-700',
        description: 'Delivery fluctuates; needs structure, feedback, and stability to regain consistency.'
      },
      'Status Quo': {
        zone: 'Baseline (5-6): Reliable Performance Zone',
        color: 'text-blue-700',
        description: 'Dependable, steady performer maintaining contribution and growth expectations.'
      },
      'Raw Talent': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        color: 'text-indigo-700',
        description: 'Shows strong curiosity and growth potential; contribution improving but not yet consistent.'
      },
      'Untapped Potential': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        color: 'text-indigo-700',
        description: 'Strong contributor needing challenge or scope expansion to sustain growth and engagement.'
      },
      'High Impact': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        color: 'text-indigo-700',
        description: 'Trusted performer delivering consistent, measurable outcomes that elevate the team.'
      },
      'Developing Driver': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        color: 'text-indigo-700',
        description: 'Combines capability and initiative; drives improvement, collaboration, and influence across functions.'
      },
      'Transformative Outcomes': {
        zone: 'Exceptional (11-12): Transformational Zone',
        color: 'text-yellow-700',
        description: 'Sustained excellence across all domains; delivers enterprise-level impact and shapes the future.'
      }
    };
    return descriptions[position] || descriptions['Status Quo'];
  };

  const positionInfo = getPositionDescription(position);

  return (
    <>
      {/* Assessment Guide Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Guide</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-blue-700 mb-2">Contribution (X-axis)</h4>
            <p className="text-sm text-gray-700">The reliability, impact, and outcomes delivered today. It measures execution, accountability, and delivery strength.</p>
          </div>
          
          <div>
            <h4 className="font-bold text-green-700 mb-2">Growth (Y-axis)</h4>
            <p className="text-sm text-gray-700">The capacity and willingness to learn, adapt, and expand pace, scope, or responsibility. It reflects curiosity, trajectory, and readiness to take on more.</p>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Scoring Scale</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="font-semibold">0 - Low:</span> Below expectations</p>
              <p><span className="font-semibold">1 - Meeting:</span> On track, reliable</p>
              <p><span className="font-semibold">2 - Exceeding:</span> Above expectations</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Culture */}
        <div className="bg-white rounded-lg shadow-md border-l-4 border-purple-500 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Culture</h3>
          <div className="bg-purple-50 border-l-2 border-purple-400 p-3 mb-5">
            <p className="text-sm text-gray-700 font-medium">How we show up. Collaboration, communication, accountability, and alignment with values.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold mr-2">CONTRIBUTION</span>
                {scores.culture.contribution}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.culture.contribution}
                onChange={(e) => onSliderChange('culture', 'contribution', e.target.value)}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 - Low</span>
                <span>1 - Meeting</span>
                <span>2 - Exceeding</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold mr-2">GROWTH</span>
                {scores.culture.growth}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.culture.growth}
                onChange={(e) => onSliderChange('culture', 'growth', e.target.value)}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb-green"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 - Limited</span>
                <span>1 - Moderate</span>
                <span>2 - High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Competencies */}
        <div className="bg-white rounded-lg shadow-md border-l-4 border-orange-500 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Competencies</h3>
          <div className="bg-orange-50 border-l-2 border-orange-400 p-3 mb-5">
            <p className="text-sm text-gray-700 font-medium">What we know. The technical and functional skills that enable reliable, high-quality work.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold mr-2">CONTRIBUTION</span>
                {scores.competencies.contribution}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.competencies.contribution}
                onChange={(e) => onSliderChange('competencies', 'contribution', e.target.value)}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 - Low</span>
                <span>1 - Meeting</span>
                <span>2 - Exceeding</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold mr-2">GROWTH</span>
                {scores.competencies.growth}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.competencies.growth}
                onChange={(e) => onSliderChange('competencies', 'growth', e.target.value)}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb-green"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 - Limited</span>
                <span>1 - Moderate</span>
                <span>2 - High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Execution */}
        <div className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Execution</h3>
          <div className="bg-blue-50 border-l-2 border-blue-400 p-3 mb-5">
            <p className="text-sm text-gray-700 font-medium">What we deliver. The ability to translate plans into results that move the business forward.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold mr-2">CONTRIBUTION</span>
                {scores.execution.contribution}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.execution.contribution}
                onChange={(e) => onSliderChange('execution', 'contribution', e.target.value)}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 - Low</span>
                <span>1 - Meeting</span>
                <span>2 - Exceeding</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold mr-2">GROWTH</span>
                {scores.execution.growth}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.execution.growth}
                onChange={(e) => onSliderChange('execution', 'growth', e.target.value)}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb-green"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 - Limited</span>
                <span>1 - Moderate</span>
                <span>2 - High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nine-Box Position Preview */}
        <div className="bg-white rounded-lg shadow-md border-l-4 border-indigo-500 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">MSH³ Compass</h3>
          
          <div className="flex items-center">
            <div className="text-xs text-gray-600 font-medium mr-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              GROWTH
            </div>
            
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-2 mb-2">
                {/* Row 3 - High Growth */}
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Raw Talent' ? 'border-purple-600 bg-purple-400 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-purple-100 opacity-60'}`}>
                  <div className={`text-xs ${position === 'Raw Talent' ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>Raw Talent</div>
                </div>
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'High Impact' ? 'border-blue-600 bg-blue-500 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-blue-200 opacity-60'}`}>
                  <div className={`text-xs ${position === 'High Impact' ? 'font-bold text-white' : 'font-semibold text-gray-700'}`}>High Impact</div>
                </div>
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Transformative Outcomes' ? 'border-yellow-600 bg-yellow-400 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-yellow-200 opacity-60'}`}>
                  <div className={`text-xs leading-tight ${position === 'Transformative Outcomes' ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>Transformative Outcomes</div>
                </div>

                {/* Row 2 - Medium Growth */}
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Narrow Contributor' ? 'border-orange-600 bg-orange-400 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-orange-200 opacity-60'}`}>
                  <div className={`text-xs leading-tight ${position === 'Narrow Contributor' ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>Narrow Contributor</div>
                </div>
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Status Quo' ? 'border-blue-600 bg-blue-500 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-blue-200 opacity-60'}`}>
                  <div className={`text-xs ${position === 'Status Quo' ? 'font-bold text-white' : 'font-semibold text-gray-700'}`}>Status Quo</div>
                </div>
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Developing Driver' ? 'border-blue-600 bg-blue-500 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-blue-200 opacity-60'}`}>
                  <div className={`text-xs leading-tight ${position === 'Developing Driver' ? 'font-bold text-white' : 'font-semibold text-gray-700'}`}>Developing Driver</div>
                </div>

                {/* Row 1 - Low Growth */}
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Critical Risk' ? 'border-red-600 bg-red-400 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-red-200 opacity-60'}`}>
                  <div className={`text-xs ${position === 'Critical Risk' ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>Critical Risk</div>
                </div>
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Inconsistent' ? 'border-orange-600 bg-orange-400 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-orange-200 opacity-60'}`}>
                  <div className={`text-xs ${position === 'Inconsistent' ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>Inconsistent</div>
                </div>
                <div className={`p-3 rounded-lg border-2 text-center transition-all h-16 flex items-center justify-center ${position === 'Untapped Potential' ? 'border-purple-600 bg-purple-400 shadow-2xl scale-110 font-bold' : 'border-gray-300 bg-purple-100 opacity-60'}`}>
                  <div className={`text-xs leading-tight ${position === 'Untapped Potential' ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>Untapped Potential</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 font-medium text-center">CONTRIBUTION</div>
            </div>
          </div>

          <div className="text-center mt-3">
            <p className="text-lg font-bold text-gray-900">{position}</p>
            <p className="text-xs text-gray-500">Composite: {composite}</p>
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{titlePrefix} Assessment Summary</h3>
        <p className="text-sm text-gray-600">
          Total Contribution: {totalContribution} | 
          Total Growth: {totalGrowth} | 
          Composite Score: {composite}
        </p>
      </div>
    </>
  );
};

export default AssessmentGrid;