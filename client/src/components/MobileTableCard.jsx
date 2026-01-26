import React from 'react';

const MobileTableCard = ({ data, fields, onEdit, onDelete }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Header với actions nếu có */}
      {(onEdit || onDelete) && (
        <div className="flex justify-end gap-2 mb-3 pb-3 border-b">
          {onEdit && (
            <button
              onClick={() => onEdit(data)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              aria-label="Chỉnh sửa"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(data)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              aria-label="Xóa"
            >
              🗑️
            </button>
          )}
        </div>
      )}

      {/* Data fields */}
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key} className="flex justify-between py-2 border-b last:border-0">
            <span className="font-medium text-sm text-gray-600">{field.label}:</span>
            <span className="text-sm text-gray-900">
              {field.render ? field.render(data[field.key], data) : data[field.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileTableCard;
