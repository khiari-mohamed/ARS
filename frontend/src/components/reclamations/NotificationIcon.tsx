import React from 'react';

export const NotificationIcon: React.FC<{ count: number; onClick: () => void }> = ({
  count,
  onClick,
}) => (
  <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={onClick} aria-label="Notifications">
    <span role="img" aria-label="Notifications" className="text-2xl">
      🔔
    </span>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold">
        {count > 99 ? '99+' : count}
      </span>
    )}
  </button>
);