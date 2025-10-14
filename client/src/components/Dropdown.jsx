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
  selectClassName = ''
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${labelClassName}`}>
          {label}
        </label>
      )}
      <select
        value={selectedValue || ''}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled || loading}
        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm
          ${selectClassName}
          ${disabled || loading ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}
        `}
      >
        {placeholder && <option value="">{loading ? 'Loading...' : placeholder}</option>}
        {!loading && options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
