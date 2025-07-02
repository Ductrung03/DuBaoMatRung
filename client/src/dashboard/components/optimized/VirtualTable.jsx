// client/src/dashboard/components/optimized/VirtualTable.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

const VirtualTable = ({ data, onRowClick, columns }) => {
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data;
    
    if (filterText) {
      filtered = data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, filterText, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const Row = ({ index, style }) => {
    const row = processedData[index];
    
    return (
      <div
        style={style}
        className={`table-row ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 cursor-pointer border-b`}
        onClick={() => onRowClick(row)}
      >
        {columns.map((col, colIndex) => (
          <div
            key={colIndex}
            className="table-cell px-4 py-2 text-sm"
            style={{ width: col.width || '150px' }}
          >
            {formatCellValue(row[col.key], col.key)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="virtual-table">
      {/* Controls */}
      <div className="table-controls p-4 bg-gray-100">
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
        <span className="ml-4 text-sm text-gray-600">
          Hiển thị {processedData.length} / {data.length} dòng
        </span>
      </div>

      {/* Header */}
      <div className="table-header bg-green-600 text-white flex">
        {columns.map((col, index) => (
          <div
            key={index}
            className="table-header-cell px-4 py-3 font-semibold cursor-pointer hover:bg-green-700"
            style={{ width: col.width || '150px' }}
            onClick={() => handleSort(col.key)}
          >
            {col.label}
            {sortConfig.key === col.key && (
              <span className="ml-1">
                {sortConfig.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Virtual list */}
      <List
        height={400}
        itemCount={processedData.length}
        itemSize={50}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};

function formatCellValue(value, columnKey) {
  if (columnKey === 'area' && value) {
    return `${(value / 10000).toFixed(1)} ha`;
  }
  if (['start_dau', 'end_sau'].includes(columnKey) && value) {
    return new Date(value).toLocaleDateString('vi-VN');
  }
  return value || '';
}

export default VirtualTable;