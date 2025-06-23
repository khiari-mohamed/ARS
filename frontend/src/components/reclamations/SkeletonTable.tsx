import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => (
  <table className="w-full border rounded">
    <thead>
      <tr>
        {Array.from({ length: cols }).map((_, i) => (
          <th key={i}><Skeleton height={20} /></th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}><Skeleton height={18} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
