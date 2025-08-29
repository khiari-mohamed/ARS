import React, { useState } from 'react';

interface UserPerformanceProps {
  data: any[];
}

const UserPerformance: React.FC<UserPerformanceProps> = ({ data }) => {
  const [sortField, setSortField] = useState<string>('bsProcessed');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = Array.isArray(data) ? [...data].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  }) : [];

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 80) return '#10b981';
    if (efficiency >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↗️' : '↘️';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, color: '#374151', fontSize: '1.1rem' }}>Performance Équipe</h4>
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          backgroundColor: '#dbeafe', 
          color: '#1e40af', 
          borderRadius: '12px', 
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {sortedData.length} membres
        </span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
            <tr>
              <th 
                onClick={() => handleSort('userName')}
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'left', 
                  fontWeight: '600', 
                  color: '#374151',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  userSelect: 'none'
                }}
              >
                Utilisateur {getSortIcon('userName')}
              </th>
              <th 
                onClick={() => handleSort('bsProcessed')}
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'center', 
                  fontWeight: '600', 
                  color: '#374151',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  userSelect: 'none'
                }}
              >
                Traités {getSortIcon('bsProcessed')}
              </th>
              <th 
                onClick={() => handleSort('efficiency')}
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'center', 
                  fontWeight: '600', 
                  color: '#374151',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  userSelect: 'none'
                }}
              >
                Efficacité {getSortIcon('efficiency')}
              </th>
              <th 
                onClick={() => handleSort('slaCompliance')}
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'center', 
                  fontWeight: '600', 
                  color: '#374151',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  userSelect: 'none'
                }}
              >
                SLA {getSortIcon('slaCompliance')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? sortedData.map((user, idx) => (
              <tr 
                key={user.userId || idx} 
                style={{ 
                  backgroundColor: idx === 0 ? '#f0f9ff' : idx % 2 === 0 ? '#fafbfc' : 'white',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = idx === 0 ? '#f0f9ff' : idx % 2 === 0 ? '#fafbfc' : 'white';
                }}
              >
                <td style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {idx === 0 && <span style={{ fontSize: '1.2rem' }}>🏆</span>}
                    {idx === 1 && <span style={{ fontSize: '1.2rem' }}>🥈</span>}
                    {idx === 2 && <span style={{ fontSize: '1.2rem' }}>🥉</span>}
                    <span style={{ fontWeight: idx < 3 ? '600' : '500' }}>
                      {user.userName || user.user || `Utilisateur ${idx + 1}`}
                    </span>
                  </div>
                </td>
                <td style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'center', 
                  borderBottom: '1px solid #f3f4f6',
                  fontWeight: '600',
                  color: '#059669'
                }}>
                  {user.bsProcessed || 0}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: getPerformanceColor(user.efficiency || 0)
                      }}
                    ></div>
                    <span style={{ fontWeight: '600', color: getPerformanceColor(user.efficiency || 0) }}>
                      {user.efficiency || 0}%
                    </span>
                  </div>
                </td>
                <td style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'center', 
                  borderBottom: '1px solid #f3f4f6',
                  fontWeight: '600',
                  color: (user.slaCompliance || 0) >= 90 ? '#059669' : (user.slaCompliance || 0) >= 70 ? '#f59e0b' : '#ef4444'
                }}>
                  {user.slaCompliance || 0}%
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2rem' }}>📊</span>
                    <span>Aucune donnée de performance disponible</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserPerformance;
