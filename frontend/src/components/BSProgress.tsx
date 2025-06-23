import React from 'react';

interface BSProgressProps {
  total: number;
  progress: number;
}

const BSProgress: React.FC<BSProgressProps> = ({ total, progress }) => {
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>BS traités: {progress}/{total}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default BSProgress;
