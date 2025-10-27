// 📁 SAVE TO: src/components/hubs/PublishedMSHScoresGrid.jsx
// Published MSH Scores - Historical performance tracking view
// ✅ FIXED: Line 225 now uses score.id (Firestore doc ID) instead of score.mshId (readable string)

import React from 'react';
import { Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';

function PublishedMSHScoresGrid({
  mshScores = [],
  onViewScore,
  emptyStateMessage = 'No published scores found'
}) {

  const groupByYear = (scores) => {
    const groups = {};
    
    scores.forEach(score => {
      const year = score.cycleYear || new Date().getFullYear();
      
      if (!groups[year]) {
        groups[year] = {
          year,
          scores: []
        };
      }
      
      groups[year].scores.push(score);
    });
    
    // Sort by year descending (newest first)
    return Object.values(groups).sort((a, b) => b.year - a.year);
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || 'Unknown';
  };

  const getTypeBadge = (mshType) => {
    if (mshType === '360') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border border-purple-300 font-semibold">
          360°
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-300 font-semibold">
        1x1
      </Badge>
    );
  };

  const getAlignmentBadge = (alignment) => {
    if (alignment === 'aligned') {
      return <Badge className="bg-green-100 text-green-800 border border-green-300">Aligned</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-800 border border-orange-300">Not Aligned</Badge>;
  };

  const getHRPIndicator = (score) => {
    const badgeConfig = getHRPBadgeConfig(score);
    
    if (!badgeConfig) {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    const BadgeIcon = badgeConfig.icon;

    return (
      <Badge className={badgeConfig.className}>
        <BadgeIcon className="w-3 h-3 mr-1" />
        {badgeConfig.text}
      </Badge>
    );
  };

  const getTrendIndicator = (currentScore, previousScore) => {
    if (!previousScore) return <Minus className="w-4 h-4 text-gray-400" />;
    
    const diff = currentScore.composite - previousScore.composite;
    
    if (diff > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className="text-xs font-semibold">+{diff}</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          <span className="text-xs font-semibold">{diff}</span>
        </div>
      );
    }
    
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (mshScores.length === 0) {
    return (
      <Card className="text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Published Scores</h3>
        <p className="text-gray-600">{emptyStateMessage}</p>
      </Card>
    );
  }

  const yearGroups = groupByYear(mshScores);

  return (
    <div className="space-y-6">
      {yearGroups.map((group) => (
        <Card key={group.year} className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{group.year}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {group.scores.length} published score{group.scores.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 border border-green-300 text-lg px-4 py-2">
                YEAR {group.year}
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      MSH ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cycle
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Composite
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Trend
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      9-Box Position
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Alignment
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      HRP Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Published Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.scores.map((score, index) => {
                    const previousScore = group.scores[index + 1];
                    const publishedDate = score.publishedAt 
                      ? new Date(score.publishedAt.seconds * 1000).toLocaleDateString()
                      : '—';
                    
                    return (
                      <tr key={score.mshId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono font-bold text-indigo-600">
                            {score.mshId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getMonthName(score.cycleMonth)} {score.cycleYear}
                          </div>
                          <div className="text-xs text-gray-500">
                            {score.cycleName || 'Cycle ' + score.cycleMonth}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getTypeBadge(score.mshType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-2xl font-bold text-gray-900">
                            {score.composite}
                          </span>
                          <div className="text-xs text-gray-500">of 12</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getTrendIndicator(score, previousScore)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {score.nineBoxPosition || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getAlignmentBadge(score.alignment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getHRPIndicator(score)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{publishedDate}</div>
                          <div className="text-xs text-gray-500">
                            by {score.publishedByName || 'System'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => onViewScore?.(score.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-center font-medium mx-auto"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default PublishedMSHScoresGrid;