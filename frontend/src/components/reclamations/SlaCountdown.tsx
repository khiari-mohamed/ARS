import React, { useEffect, useState } from 'react';

interface SlaCountdownProps {
  createdAt: string | Date;
  slaDays: number;
}

function getTimeLeft(createdAt: Date, slaDays: number) {
  const deadline = new Date(createdAt.getTime() + slaDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

export const SlaCountdown: React.FC<SlaCountdownProps> = ({ createdAt, slaDays }) => {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(createdAt), slaDays));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date(createdAt), slaDays));
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [createdAt, slaDays]);

  if (!timeLeft) {
    return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">En retard</span>;
  }

  return (
    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
      {timeLeft.days > 0 && `${timeLeft.days}j `}
      {timeLeft.hours}h {timeLeft.minutes}m restants
    </span>
  );
};
