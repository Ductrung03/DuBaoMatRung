import React from "react";

const Select = ({ isOpen }) => {
  return (
    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
      <svg
        className={`w-4 h-4 text-green-500 transform transition-transform duration-300 ${
          isOpen ? "rotate-360" : "rotate-90"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        ></path>
      </svg>
    </div>
  );
};

export default Select;
