import React from 'react';

interface KPIBoxProps {
  label: string;
  value: number | string;
  color?: 'primary' | 'success' | 'error' | 'warning' | 'info';
  className?: string;
}

/**
 * Unified KPIBox component.
 * - If color is provided, uses legacy className (kpi-box kpi-box-color).
 * - Otherwise, uses analytics style (Tailwind/utility classes).
 * - Accepts optional className for further customization.
 */
const KPIBox: React.FC<KPIBoxProps> = ({ label, value, color = 'primary', className }) => {
  // Legacy mode: use className and color
  if (color) {
    return (
      <div className={`kpi-box kpi-box-${color} ${className || ''}`}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
    );
  }

  // Analytics mode: use Tailwind/utility classes
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded p-4 flex flex-col items-center shadow ${className || ''}`}>
      <span className="text-lg font-bold text-blue-700">{value}</span>
      <span className="text-sm text-blue-900">{label}</span>
    </div>
  );
};

export default KPIBox;