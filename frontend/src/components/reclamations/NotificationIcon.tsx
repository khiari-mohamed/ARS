import React from 'react';

export const NotificationIcon: React.FC<{ count: number; onClick: () => void }> = ({
  count,
  onClick,
}) => (
  <button className="relative" onClick={onClick} aria-label="Notifications">
    <span role="img" aria-label="Notifications" className="text-2xl">
      🔔
    </span>
    {count > 0 && (
      <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
        {count}
      </span>
    )}
  </button>
);