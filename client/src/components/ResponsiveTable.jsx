import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import MobileTableCard from './MobileTableCard';

const ResponsiveTable = ({
  columns,
  data,
  mobileCardFields,
  onEdit,
  onDelete,
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState('table');

  return (
    <div className={className}>
      {/* Toggle buttons - mobile only */}
      {isMobile && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            📊 Bảng
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            📇 Thẻ
          </button>
        </div>
      )}

      {/* Card view (mobile) */}
      {isMobile && viewMode === 'cards' ? (
        <div className="space-y-3">
          {data.map((row, index) => (
            <MobileTableCard
              key={row.id || index}
              data={row}
              fields={mobileCardFields || columns.map(col => ({
                key: col.key,
                label: col.label,
                render: col.render
              }))}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        /* Table view (desktop or mobile table mode) */
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 ${col.className || ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 sticky right-0 bg-gray-50">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={row.id || index} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-2 sm:px-4 py-2 ${col.className || ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-2 sm:px-4 py-2 sticky right-0 bg-white">
                      <div className="flex gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            ✏️
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResponsiveTable;
