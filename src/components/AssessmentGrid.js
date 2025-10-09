import React from 'react';
import { Card, StatCard } from './ui';

function AssessmentGrid({ scores, onScoreChange }) {
  
  const calculateNineBoxPosition = (scores) => {
    // Calculate total contribution (sum of all contribution scores)
    const totalContribution = scores.culture.contribution + 
                             scores.competencies.contribution + 
                             scores.execution.contribution;
    
    // Calculate total growth (sum of all growth scores)
    const totalGrowth = scores.culture.growth + 
                       scores.competencies.growth + 
                       scores.execution.growth;
    
    const composite = totalContribution + totalGrowth;

    // Determine contribution and growth levels
    let growthLevel, contribLevel;
    
    if (totalContribution <= 2) contribLevel = 'low';
    else if (totalContribution <= 4) contribLevel = 'mid';
    else contribLevel = 'high';
    
    if (totalGrowth <= 2) growthLevel = 'low';
    else if (totalGrowth <= 4) growthLevel = 'mid';
    else growthLevel = 'high';

    // Map to nine-box positions
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

  const getPositionDescription = (position) => {
    // Official MSH³ v2.5 Composite 9-Box Descriptions
    const descriptions = {
      'Critical Risk': {
        zone: 'Below Baseline (0-4): Coaching and Support Zone',
        scoreRange: '0-1',
        color: '#dc2626',
        description: 'Immediate intervention required; both growth and contribution are below expectations.'
      },
      'Narrow Contributor': {
        zone: 'Below Baseline (0-4): Coaching and Support Zone',
        scoreRange: '2-4',
        color: '#fca5a5',
        description: 'Performs reliably within a limited scope; limited adaptability outside familiar territory.'
      },
      'Inconsistent': {
        zone: 'Below Baseline (0-4): Coaching and Support Zone',
        scoreRange: '2-4',
        color: '#fca5a5',
        description: 'Delivery fluctuates; needs structure, feedback, and stability to regain consistency.'
      },
      'Status Quo': {
        zone: 'Baseline (5-6): Reliable Performance Zone',
        scoreRange: '5-6',
        color: '#a7c4a0',
        description: 'Dependable, steady performer maintaining contribution and growth expectations; represents IS\'s baseline of reliability.'
      },
      'Raw Talent': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        scoreRange: '7-8',
        color: '#06b6d4',
        description: 'Shows strong curiosity and growth potential; contribution improving but not yet consistent.'
      },
      'Untapped Potential': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        scoreRange: '7-8',
        color: '#06b6d4',
        description: 'Strong contributor needing challenge or scope expansion to sustain growth and engagement.'
      },
      'High Impact': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        scoreRange: '9-10',
        color: '#3b82f6',
        description: 'Trusted performer delivering consistent, measurable outcomes that elevate the team.'
      },
      'Developing Driver': {
        zone: 'Above Baseline (7-10): High-Performance Zone',
        scoreRange: '9-10',
        color: '#3b82f6',
        description: 'Combines capability and initiative; drives improvement, collaboration, and influence across functions.'
      },
      'Transformative Outcomes': {
        zone: 'Exceptional (11-12): Transformational Zone',
        scoreRange: '11-12',
        color: '#f59e0b',
        description: 'Sustained excellence across all domains; delivers enterprise-level impact and shapes the future of IS.'
      }
    };
    return descriptions[position] || descriptions['Status Quo'];
  };

  const totalContribution = scores.culture.contribution + 
                           scores.competencies.contribution + 
                           scores.execution.contribution;
  
  const totalGrowth = scores.culture.growth + 
                     scores.competencies.growth + 
                     scores.execution.growth;
  
  const composite = totalContribution + totalGrowth;
  const position = calculateNineBoxPosition(scores);
  const positionInfo = getPositionDescription(position);

  const nineBoxPositions = [
    { name: 'Raw Talent', row: 2, col: 0, label: 'Raw\nTalent' },
    { name: 'High Impact', row: 2, col: 1, label: 'High\nImpact' },
    { name: 'Transformative Outcomes', row: 2, col: 2, label: 'Transformative\nOutcomes' },
    { name: 'Narrow Contributor', row: 1, col: 0, label: 'Narrow\nContributor' },
    { name: 'Status Quo', row: 1, col: 1, label: 'Status\nQuo' },
    { name: 'Developing Driver', row: 1, col: 2, label: 'Developing\nDriver' },
    { name: 'Critical Risk', row: 0, col: 0, label: 'Critical\nRisk' },
    { name: 'Inconsistent', row: 0, col: 1, label: 'Inconsistent' },
    { name: 'Untapped Potential', row: 0, col: 2, label: 'Untapped\nPotential' }
  ];

  const getScoreColor = (score) => {
    if (score === 0) return 'text-red-600';
    if (score === 1) return 'text-green-600';
    return 'text-amber-500';
  };

  return (
    <>
      {/* BOX 1: Assessment Guide Header */}
      <Card borderColor="neutral" className="mb-5">
        <h3 className="text-base font-bold text-neutral-dark mb-3">
          Assessment Guide
        </h3>

        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
          <div>
            <h4 className="font-bold text-culture mb-1">Culture</h4>
            <p className="text-neutral">How we show up and engage with others.</p>
          </div>
          <div>
            <h4 className="font-bold text-competencies mb-1">Competencies</h4>
            <p className="text-neutral">What we know and can do effectively.</p>
          </div>
          <div>
            <h4 className="font-bold text-execution mb-1">Execution</h4>
            <p className="text-neutral">How we deliver results and drive impact.</p>
          </div>
        </div>

        <div className="bg-neutral-light rounded-lg p-3 text-xs text-neutral">
          <strong>Scoring:</strong> 0 = Below Expectations | 1 = Meets Expectations | 2 = Exceeds Expectations
          <br />
          <span className="italic mt-1 block">
            Challenge. Care. Trust.
          </span>
        </div>
      </Card>

      {/* BOXES 2-5: Pillars (Left) + Compass (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5 mb-5">
        
        {/* LEFT COLUMN: MSH³ Domains Stacked */}
        <div className="flex flex-col gap-5">
          
          {/* BOX 2: Culture Domain */}
          <Card borderColor="culture">
            <h3 className="text-base font-bold text-culture mb-3">Culture</h3>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-neutral-dark">Contribution</label>
                <span className={`text-sm font-bold ${getScoreColor(scores.culture.contribution)}`}>
                  {scores.culture.contribution}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.culture.contribution}
                onChange={(e) => onScoreChange('culture', 'contribution', e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-neutral-dark">Growth</label>
                <span className={`text-sm font-bold ${getScoreColor(scores.culture.growth)}`}>
                  {scores.culture.growth}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.culture.growth}
                onChange={(e) => onScoreChange('culture', 'growth', e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>
          </Card>

          {/* BOX 3: Competencies Domain */}
          <Card borderColor="competencies">
            <h3 className="text-base font-bold text-competencies mb-3">Competencies</h3>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-neutral-dark">Contribution</label>
                <span className={`text-sm font-bold ${getScoreColor(scores.competencies.contribution)}`}>
                  {scores.competencies.contribution}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.competencies.contribution}
                onChange={(e) => onScoreChange('competencies', 'contribution', e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-neutral-dark">Growth</label>
                <span className={`text-sm font-bold ${getScoreColor(scores.competencies.growth)}`}>
                  {scores.competencies.growth}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.competencies.growth}
                onChange={(e) => onScoreChange('competencies', 'growth', e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>
          </Card>

          {/* BOX 4: Execution Domain */}
          <Card borderColor="execution">
            <h3 className="text-base font-bold text-execution mb-3">Execution</h3>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-neutral-dark">Contribution</label>
                <span className={`text-sm font-bold ${getScoreColor(scores.execution.contribution)}`}>
                  {scores.execution.contribution}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.execution.contribution}
                onChange={(e) => onScoreChange('execution', 'contribution', e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-neutral-dark">Growth</label>
                <span className={`text-sm font-bold ${getScoreColor(scores.execution.growth)}`}>
                  {scores.execution.growth}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.execution.growth}
                onChange={(e) => onScoreChange('execution', 'growth', e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: MSH³ Compass (Large) */}
        <Card borderColor="msh-blue" className="flex flex-col">
          <h3 className="text-lg font-bold text-neutral-dark mb-0">MSH³ Compass</h3>
          <p className="text-sm text-neutral mb-5">Nine-Box Position</p>

          {/* Large 9-Box Grid with Axis Labels */}
          <div className="flex items-stretch gap-3 mb-3 flex-grow">
            {/* Vertical Growth Label */}
            <div className="flex items-center justify-center pr-2" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
              <span className="text-xs text-neutral font-semibold">Growth</span>
            </div>

            {/* The 9-box grid */}
            <div className="grid grid-cols-3 gap-2 flex-1">
              {nineBoxPositions.map((box) => {
                const isActive = box.name === position;
                const boxInfo = getPositionDescription(box.name);
                const boxColor = boxInfo.color;
                
                const needsDarkText = ['#fca5a5', '#a7c4a0', '#06b6d4'].includes(boxColor);
                const textColorClass = isActive 
                  ? (needsDarkText ? 'text-neutral-dark' : 'text-white') 
                  : 'text-neutral';
                
                return (
                  <div
                    key={box.name}
                    className={`rounded-lg flex items-center justify-center text-xs font-medium p-3 text-center leading-tight transition-all min-h-[80px] whitespace-pre-line ${textColorClass} ${
                      isActive ? 'font-bold border-4' : 'bg-neutral-light border-2 border-neutral-medium'
                    }`}
                    style={isActive ? { 
                      backgroundColor: boxColor,
                      borderColor: boxColor
                    } : {}}
                  >
                    {box.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Horizontal Contribution Label */}
          <div className="text-center text-xs text-neutral font-semibold mb-5 ml-11">
            Contribution
          </div>

          {/* Position Info - Shows specific zone for each position */}
          <div className="bg-neutral-light rounded-lg p-4 text-center">
            <div className="text-xl font-bold mb-1" style={{ color: positionInfo.color }}>
              {position}
            </div>
            <div className="text-xs text-neutral mb-2 uppercase tracking-wider font-semibold">
              {positionInfo.zone}
            </div>
            <div className="text-xs text-neutral-dark leading-relaxed">
              {positionInfo.description}
            </div>
          </div>
        </Card>
      </div>

      {/* BOX 6: Summary */}
      <Card borderColor="neutral">
        <h3 className="text-base font-bold text-neutral-dark mb-4">Summary</h3>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Contribution"
            value={totalContribution}
            subtext="of 6"
            borderColor="msh-indigo"
          />

          <StatCard
            label="Growth"
            value={totalGrowth}
            subtext="of 6"
            borderColor="msh-purple"
          />

          <StatCard
            label="Composite"
            value={composite}
            subtext="of 12"
            borderColor="custom"
            customColor={positionInfo.color}
          />
        </div>
      </Card>
    </>
  );
}

export default AssessmentGrid;