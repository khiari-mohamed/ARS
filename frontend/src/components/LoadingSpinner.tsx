import React from 'react';

/**
 * Unified LoadingSpinner component.
 * - If you want the minimal spinner (legacy), use <LoadingSpinner minimal />
 * - By default, uses SVG spinner (analytics style).
 */
interface LoadingSpinnerProps {
  minimal?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ minimal, className }) => {
  if (minimal) {
    // Legacy: spinning div
    return (
      <div className={`flex justify-center items-center ${className || ''}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  // Analytics: SVG spinner
  return (
    <div className={`flex items-center justify-center py-8 ${className || ''}`}>
      <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    </div>
  );
};

export default LoadingSpinner;