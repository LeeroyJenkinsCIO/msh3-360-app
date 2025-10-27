// 📁 SAVE TO: src/components/hubs/KPIStatCard.jsx
// Reusable KPI Stat Card with Trend Indicators

import React from 'react';
import Card from '../ui/Card';

/**
 * KPIStatCard - Reusable KPI card for hub dashboards
 * 
 * @param {string} title - Card title (e.g., "ISOS Compass")
 * @param {number|string} value - Main KPI value (current month composite score)
 * @param {string} secondaryValue - Secondary value (completion count like "5 / 8")
 * @param {number} maxValue - Maximum value for the KPI (e.g., 12)
 * @param {React.Component} icon - Lucide icon component
 * @param {string} gradient - Gradient style: "blue", "purple", "green", "orange", "pink", "indigo", "emerald", "cyan"
 * @param {number|string|null} trend - Trend value (e.g., +0.2, -0.1, 0 for no change, "---" for no data)
 * @param {string} trendLabel - Label for trend (e.g., "vs last month")
 * @param {Array} metadata - Array of { label: string, value: string|number } for bottom section
 * @param {string} className - Additional CSS classes
 */
function KPIStatCard({ 
  title = "Performance", 
  value = "—", 
  secondaryValue = null,
  maxValue = null,
  icon: Icon,
  gradient = "blue",
  trend = null,
  trendLabel = "vs last month",
  metadata = [],
  className = ""
}) {
  
  // Gradient configurations
  const gradientStyles = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      divider: "border-blue-200"
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-pink-50",
      border: "border-purple-200",
      icon: "text-purple-600",
      divider: "border-purple-200"
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50",
      border: "border-green-200",
      icon: "text-green-600",
      divider: "border-green-200"
    },
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-amber-50",
      border: "border-orange-200",
      icon: "text-orange-600",
      divider: "border-orange-200"
    },
    pink: {
      bg: "bg-gradient-to-br from-pink-50 to-rose-50",
      border: "border-pink-200",
      icon: "text-pink-600",
      divider: "border-pink-200"
    },
    indigo: {
      bg: "bg-gradient-to-br from-indigo-50 to-purple-50",
      border: "border-indigo-200",
      icon: "text-indigo-600",
      divider: "border-indigo-200"
    },
    emerald: {
      bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
      border: "border-emerald-200",
      icon: "text-emerald-600",
      divider: "border-emerald-200"
    },
    cyan: {
      bg: "bg-gradient-to-br from-cyan-50 to-blue-50",
      border: "border-cyan-200",
      icon: "text-cyan-600",
      divider: "border-cyan-200"
    }
  };

  const styles = gradientStyles[gradient] || gradientStyles.blue;

  // Check if value is numeric
  const isNumericValue = () => {
    if (value === null || value === undefined || value === "—" || value === "") return false;
    const numValue = parseFloat(value);
    return !isNaN(numValue);
  };

  // Determine trend direction and icon
  const getTrendDisplay = () => {
    // Handle null/undefined - don't show anything
    if (trend === null || trend === undefined) return null;
    
    // If trend is "---", always show it (no previous data available)
    if (trend === "---") {
      return {
        icon: "—",
        color: "text-gray-400",
        text: "---"
      };
    }
    
    // For numeric trends
    const trendValue = parseFloat(trend);
    if (isNaN(trendValue)) {
      // If trend isn't a number and isn't "---", don't show it
      return null;
    }
    
    if (trendValue > 0) {
      return {
        icon: "↑",
        color: "text-green-600",
        text: `+${trendValue.toFixed(1)}`
      };
    } else if (trendValue < 0) {
      return {
        icon: "↓",
        color: "text-red-600",
        text: `${trendValue.toFixed(1)}`
      };
    } else {
      return {
        icon: "→",
        color: "text-gray-500",
        text: "0.0"
      };
    }
  };

  const trendDisplay = getTrendDisplay();
  const shouldShowMaxValue = maxValue !== null && maxValue !== undefined && isNumericValue();

  return (
    <Card className={`${styles.bg} border-2 ${styles.border} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-gray-900">
              {value ?? "—"}
            </span>
          </div>
          
          {/* Secondary Value (Completion Count) */}
          {secondaryValue && (
            <div className="mt-1">
              <span className="text-sm font-medium text-gray-600">
                {secondaryValue}
              </span>
            </div>
          )}
          
          {/* Trend Indicator */}
          {trendDisplay && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${trendDisplay.color}`}>
              <span className="text-lg">{trendDisplay.icon}</span>
              <span>{trendDisplay.text} {trend !== "---" ? trendLabel : ""}</span>
            </div>
          )}
        </div>
        {Icon && <Icon className={`w-8 h-8 ${styles.icon}`} />}
      </div>
      
      {metadata.length > 0 && (
        <div className={`mt-4 pt-3 border-t ${styles.divider}`}>
          <div className="space-y-2">
            {metadata.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default KPIStatCard;