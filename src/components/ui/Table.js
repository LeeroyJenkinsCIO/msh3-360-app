import React from 'react';

/**
 * Table Component
 * Consistent table styling for data display
 * 
 * Props:
 * - columns: Array of column definitions [{ key, label, width, align, render }]
 * - data: Array of row objects
 * - onRowClick: Optional row click handler
 * - className: Additional classes
 * - emptyMessage: Message when no data
 */

const Table = ({ 
  columns = [], 
  data = [], 
  onRowClick = null,
  className = '',
  emptyMessage = 'No data available'
}) => {
  
  const handleRowClick = (row) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <p className="text-neutral">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-card shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-dark text-white">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-sm font-semibold ${
                    column.align === 'center' ? 'text-center' : ''
                  } ${column.align === 'right' ? 'text-right' : ''}`}
                  style={{ width: column.width || 'auto' }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-light">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => handleRowClick(row)}
                className={`hover:bg-neutral-light/50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-sm text-neutral-dark ${
                      column.align === 'center' ? 'text-center' : ''
                    } ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.render 
                      ? column.render(row[column.key], row) 
                      : row[column.key] || '-'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;