// 📁 SAVE TO: src/components/hubs/HistoryGrid.jsx
// History Grid - Shows published MSH scores ONLY
// NO DATA FETCHING - receives enriched data as props

import React, { useState, useMemo } from 'react';
import { Award, User, Calendar, Search, Eye, TrendingUp, Flag } from 'lucide-react';

function HistoryGrid({ 
  mshScores = [],
  currentUserId,
  onViewMSH 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState('all'); // all | self | 1x1 | 360 | p2p

  // Filter and search
  const filteredScores = useMemo(() => {
    let filtered = [...mshScores];

    // Assessment type filter
    if (assessmentTypeFilter !== 'all') {
      filtered = filtered.filter(item => {
        const type = (item.mshType || item.assessmentType || '1x1').toLowerCase();
        return type === assessmentTypeFilter;
      });
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.subjectName?.toLowerCase().includes(q) ||
        item.assessorName?.toLowerCase().includes(q) ||
        item.publisherName?.toLowerCase().includes(q) ||
        item.mshId?.toLowerCase().includes(q) ||
        item.pillarName?.toLowerCase().includes(q)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.publishedAt || new Date(0);
      const dateB = b.publishedAt || new Date(0);
      return dateB - dateA;
    });

    return filtered;
  }, [mshScores, assessmentTypeFilter, searchQuery]);

  const getAssessmentTypeBadge = (item) => {
    let type = item.mshType || item.assessmentType || '1x1';
    let color = 'bg-gray-100 text-gray-700';
    
    if (type === 'self') {
      type = 'Self';
      color = 'bg-purple-100 text-purple-700';
    } else if (type === '360') {
      color = 'bg-blue-100 text-blue-700';
    } else if (type.toLowerCase() === 'p2p' || type.toLowerCase() === 'peer') {
      type = 'P2P';
      color = 'bg-green-100 text-green-700';
    } else {
      type = '1x1';
      color = 'bg-gray-100 text-gray-700';
    }

    return { type, color };
  };

  const getHRPBadge = (item) => {
    const hasHRP = item.hrpRequested || item.hrp || item.hrpStatus || item.hrpReview;
    const isReviewed = item.hrpReviewedAt || item.hrpCompleted || 
                      item.hrpStatus === 'reviewed' || item.hrpStatus === 'completed';

    if (!hasHRP) {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (isReviewed) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <Flag className="w-3 h-3 mr-1" />
          Reviewed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        <Flag className="w-3 h-3 mr-1" />
        HRP
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">Published MSH History</h3>
        <p className="text-sm text-gray-600 mt-1">
          All published MSH scores ({filteredScores.length})
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assessment Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Assessment Type
            </label>
            <select
              value={assessmentTypeFilter}
              onChange={(e) => setAssessmentTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="self">Self Assessments</option>
              <option value="1x1">1x1 Assessments</option>
              <option value="360">360° Assessments</option>
              <option value="p2p">P2P Assessments</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or MSH ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredScores.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No published MSH scores found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MSH ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Assessor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Published By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Aligned
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    HRP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScores.map((item) => {
                  const { type, color } = getAssessmentTypeBadge(item);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {item.mshId}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                          {type}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{item.subjectName}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.assessorName || '—'}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.publisherName || '—'}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.isAligned ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Aligned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Not Aligned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {getHRPBadge(item)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.compositeScore !== undefined ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-gray-900">
                              {item.compositeScore}<span className="text-gray-500 font-normal">/12</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {item.publishedAt ? item.publishedAt.toDate().toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => onViewMSH?.(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
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
      )}
    </div>
  );
}

export default HistoryGrid;