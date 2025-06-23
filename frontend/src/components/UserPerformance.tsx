import React from 'react';

interface UserPerformanceProps {
  data: any[];
}

const UserPerformance: React.FC<UserPerformanceProps> = ({ data }) => (
  <div>
    <h4>Team Leaderboard</h4>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>User</th>
          <th>BS traités</th>
          <th>Temps moyen (min)</th>
        </tr>
      </thead>
      <tbody>
        {data.map((user, idx) => (
          <tr key={idx} style={{ background: idx === 0 ? '#e3f2fd' : undefined }}>
            <td>{user.user}</td>
            <td>{user.bsProcessed}</td>
            <td>{user.avgTime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default UserPerformance;
