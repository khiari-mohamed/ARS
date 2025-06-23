import React from 'react';

interface TeamPerformanceDashboardProps {
  data: any[]; // Adjust the type based on your data structure
}

const TeamPerformanceDashboard: React.FC<TeamPerformanceDashboardProps> = ({ data }) => {
  return (
    <div>
      <h3>Team Performance</h3>
      {/* Render team performance data here */}
      {data.map((item, index) => (
        <div key={index}>{item.name}: {item.performance}</div>
      ))}
    </div>
  );
};

export default TeamPerformanceDashboard;
