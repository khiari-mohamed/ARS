import React from 'react';
import { Table, Tag } from 'antd';

// Define the row type for clarity
type Row = {
  virement: any;
  external?: any;
};

export const ReconciliationReportTable: React.FC<{ report: any }> = ({ report }) => {
  // Normalize data: matched are already { virement, external }, unmatched are just virement objects
  const rows: Row[] = [
    ...(report.matched || []),
    ...(report.unmatched || []).map((v: any) => ({ virement: v })),
  ];

  return (
    <Table
      dataSource={rows}
      rowKey={r => r.virement?.id}
      columns={[
        { title: 'Référence', dataIndex: ['virement', 'referenceBancaire'], key: 'reference' },
        { title: 'Montant', dataIndex: ['virement', 'montant'], key: 'montant' },
        { title: 'Date', dataIndex: ['virement', 'dateExecution'], key: 'date', render: d => d && new Date(d).toLocaleDateString() },
        {
          title: 'Statut',
          key: 'statut',
          render: (_: any, r: Row) =>
            r.external ? <Tag color="green">Apparié</Tag> : <Tag color="red">Non apparié</Tag>
        }
      ]}
    />
  );
};