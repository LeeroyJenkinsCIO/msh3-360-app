import React from 'react';

function AssessmentGrid({ scores, onScoreChange }) {
  
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

  const getPositionDescription = (position) => {
    const descriptions = {
      'Critical Risk': {
        zone: 'Below Baseline (0-4)',
        color: '#dc2626',
        description: 'Immediate intervention required; both growth and contribution are below expectations.'
      },
      'Narrow Contributor': {
        zone: 'Below Baseline (0-4)',
        color: '#fca5a5',
        description: 'Performs reliably within a limited scope; limited adaptability outside familiar territory.'
      },
      'Inconsistent': {
        zone: 'Below Baseline (0-4)',
        color: '#fca5a5',
        description: 'Delivery fluctuates; needs structure, feedback, and stability to regain consistency.'
      },
      'Untapped Potential': {
        zone: 'Meets Baseline (5-8)',
        color: '#06b6d4',
        description: 'Strong execution but limited growth trajectory; focus on expanding influence.'
      },
      'Status Quo': {
        zone: 'Meets Baseline (5-8)',
        color: '#a7c4a0',
        description: 'Reliable and steady; maintains current role expectations without stretching beyond.'
      },
      'Developing Driver': {
        zone: 'Meets Baseline (5-8)',
        color: '#3b82f6',
        description: 'Delivers results consistently; beginning to demonstrate leadership potential.'
      },
      'Raw Talent': {
        zone: 'Exceeds Baseline (9-12)',
        color: '#06b6d4',
        description: 'High potential with room to grow; needs targeted development to maximize impact.'
      },
      'High Impact': {
        zone: 'Exceeds Baseline (9-12)',
        color: '#3b82f6',
        description: 'Strong all-around performer ready for increased responsibility and scope.'
      },
      'Transformative Outcomes': {
        zone: 'Exceeds Baseline (9-12)',
        color: '#f59e0b',
        description: 'Top-tier performer driving exceptional results and organizational growth.'
      }
    };
    return descriptions[position] || descriptions['Status Quo'];
  };

  const totalContribution = scores.culture.contribution + scores.competencies.contribution + scores.execution.contribution;
  const totalGrowth = scores.culture.growth + scores.competencies.growth + scores.execution.growth;
  const composite = totalContribution + totalGrowth;
  const position = calculateNineBoxPosition(scores);
  const positionInfo = getPositionDescription(position);

  const nineBoxPositions = [
    { name: 'Raw Talent', row: 2, col: 0, label: 'Raw\nTalent' },
    { name: 'High Impact', row: 2, col: 1, label: 'High\nImpact' },
    { name: 'Transformative Outcomes', row: 2, col: 2, label: 'Transformational\nOutcomes' },
    { name: 'Narrow Contributor', row: 1, col: 0, label: 'Narrow\nContributor' },
    { name: 'Status Quo', row: 1, col: 1, label: 'Status\nQuo' },
    { name: 'Developing Driver', row: 1, col: 2, label: 'Developing\nDriver' },
    { name: 'Critical Risk', row: 0, col: 0, label: 'Critical\nRisk' },
    { name: 'Inconsistent', row: 0, col: 1, label: 'Inconsistent' },
    { name: 'Untapped Potential', row: 0, col: 2, label: 'Untapped\nPotential' }
  ];

  return (
    <>
      {/* BOX 1: Assessment Guide Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px',
        borderTop: '4px solid #64748b'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          Assessment Guide
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          fontSize: '13px'
        }}>
          <div>
            <h4 style={{ fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>
              Culture
            </h4>
            <p style={{ color: '#6b7280' }}>How we show up.</p>
          </div>

          <div>
            <h4 style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
              Competencies
            </h4>
            <p style={{ color: '#6b7280' }}>What we know.</p>
          </div>

          <div>
            <h4 style={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
              Execution
            </h4>
            <p style={{ color: '#6b7280' }}>How we deliver.</p>
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <strong>Scoring:</strong> 0 = Below Expectations | 1 = Meets Expectations | 2 = Exceeds Expectations
          <br />
          <span style={{ fontStyle: 'italic', marginTop: '4px', display: 'block' }}>
            Be honest. Challenge directly, care personally.
          </span>
        </div>
      </div>

      {/* BOXES 2-5: Domains (Left) + Compass (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '20px',
        marginBottom: '20px',
        position: 'relative'
      }}>
        {/* LEFT COLUMN: Domains Stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* BOX 2: Culture */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '4px solid #8b5cf6',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Culture
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  Contribution
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: scores.culture.contribution === 0 ? '#ef4444' : 
                         scores.culture.contribution === 1 ? '#f59e0b' : '#10b981'
                }}>
                  {scores.culture.contribution}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.culture.contribution}
                onChange={(e) => onScoreChange('culture', 'contribution', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  Growth
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: scores.culture.growth === 0 ? '#ef4444' : 
                         scores.culture.growth === 1 ? '#f59e0b' : '#10b981'
                }}>
                  {scores.culture.growth}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.culture.growth}
                onChange={(e) => onScoreChange('culture', 'growth', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* BOX 3: Competencies */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '4px solid #3b82f6',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Competencies
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  Contribution
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: scores.competencies.contribution === 0 ? '#ef4444' : 
                         scores.competencies.contribution === 1 ? '#f59e0b' : '#10b981'
                }}>
                  {scores.competencies.contribution}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.competencies.contribution}
                onChange={(e) => onScoreChange('competencies', 'contribution', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  Growth
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: scores.competencies.growth === 0 ? '#ef4444' : 
                         scores.competencies.growth === 1 ? '#f59e0b' : '#10b981'
                }}>
                  {scores.competencies.growth}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.competencies.growth}
                onChange={(e) => onScoreChange('competencies', 'growth', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* BOX 4: Execution */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '4px solid #10b981',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Execution
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  Contribution
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: scores.execution.contribution === 0 ? '#ef4444' : 
                         scores.execution.contribution === 1 ? '#f59e0b' : '#10b981'
                }}>
                  {scores.execution.contribution}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.execution.contribution}
                onChange={(e) => onScoreChange('execution', 'contribution', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  Growth
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: scores.execution.growth === 0 ? '#ef4444' : 
                         scores.execution.growth === 1 ? '#f59e0b' : '#10b981'
                }}>
                  {scores.execution.growth}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                value={scores.execution.growth}
                onChange={(e) => onScoreChange('execution', 'growth', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MSH³ Compass (Large) */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderTop: '4px solid #f59e0b',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '4px'
          }}>
            MSH³ Compass
          </h3>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '20px'
          }}>
            Nine-Box Position
          </p>

          {/* Large 9-Box Grid with Axis Labels */}
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '12px',
            marginBottom: '12px',
            flexGrow: 1
          }}>
            {/* Vertical Growth Label */}
            <div style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingRight: '8px'
            }}>
              Growth
            </div>

            {/* The 9-box grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              flex: 1
            }}>
              {nineBoxPositions.map((box) => {
                const isActive = box.name === position;
                const boxInfo = getPositionDescription(box.name);
                const boxColor = boxInfo.color;
                
                // Determine text color based on background
                const needsDarkText = ['#fca5a5', '#a7c4a0', '#06b6d4'].includes(boxColor);
                const textColor = isActive ? (needsDarkText ? '#1f2937' : 'white') : '#6b7280';
                
                return (
                  <div
                    key={box.name}
                    style={{
                      backgroundColor: isActive ? boxColor : '#f9fafb',
                      border: isActive ? `3px solid ${boxColor}` : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: isActive ? 'bold' : '500',
                      color: textColor,
                      padding: '12px 8px',
                      textAlign: 'center',
                      lineHeight: '1.3',
                      transition: 'all 0.2s',
                      whiteSpace: 'pre-line',
                      minHeight: '80px'
                    }}
                  >
                    {box.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Horizontal Contribution Label */}
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '600',
            marginBottom: '20px',
            marginLeft: '44px'
          }}>
            Contribution
          </div>

          {/* Position Info */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: positionInfo.color,
              marginBottom: '6px'
            }}>
              {position}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#6b7280',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              {positionInfo.zone}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#374151',
              lineHeight: '1.5'
            }}>
              {positionInfo.description}
            </div>
          </div>
        </div>
      </div>

      {/* BOX 6: Summary */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px',
        borderTop: '4px solid #14b8a6'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          Summary
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Contribution
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              {totalContribution}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              of 6
            </div>
          </div>

          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Growth
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              {totalGrowth}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              of 6
            </div>
          </div>

          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Composite
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              {composite}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              of 12
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AssessmentGrid;