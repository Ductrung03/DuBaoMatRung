import React from 'react';

const Dropdown = ({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder,
  disabled = false,
  loading = false,
  className = '',
  labelClassName = '',
  selectClassName = '',
  autoWidth = false
}) => {
  // Tìm label của option đang được chọn để hiển thị trong title
  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';

  return (
    <div className={`mb-4 ${className}`} style={{ maxWidth: '100%' }}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${labelClassName}`}>
          {label}
        </label>
      )}
      <select
        value={selectedValue || ''}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled || loading}
        title={selectedLabel}
        className={`mt-1 block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm
          ${selectClassName}
          ${disabled || loading ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}
        `}
        style={{
          maxWidth: '100%',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}
      >
        {placeholder && <option value="">{loading ? 'Loading...' : placeholder}</option>}
        {!loading && options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value} title={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
