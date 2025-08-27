import React from 'react';
import { Table, Tag, Tooltip } from 'antd';
import { BulletinSoinItem } from '../../types/bs';

interface BSItemsTableProps {
  items: BulletinSoinItem[];
}

export const BSItemsTable: React.FC<BSItemsTableProps> = ({ items }) => {
  const columns = [
    {
      title: 'Produit/Service',
      dataIndex: 'nomProduit',
      key: 'nomProduit',
      width: 200,
    },
    {
      title: 'Chapitre',
      dataIndex: 'nomChapitre',
      key: 'nomChapitre',
      width: 120,
    },
    {
      title: 'Prestataire',
      dataIndex: 'nomPrestataire',
      key: 'nomPrestataire',
      width: 150,
    },
    {
      title: 'Date prestation',
      dataIndex: 'datePrestation',
      key: 'datePrestation',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Quantité',
      dataIndex: 'quantite',
      key: 'quantite',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Type honoraire',
      dataIndex: 'typeHonoraire',
      key: 'typeHonoraire',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'FIXE' ? 'blue' : 'green'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Dépense',
      dataIndex: 'depense',
      key: 'depense',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => `${amount?.toFixed(2) || 0} DT`,
    },
    {
      title: 'PEC',
      dataIndex: 'pec',
      key: 'pec',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ color: '#3f8600', fontWeight: 'bold' }}>
          {amount?.toFixed(2) || 0} DT
        </span>
      ),
    },
    {
      title: 'Participation',
      dataIndex: 'participationAdherent',
      key: 'participationAdherent',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ color: '#cf1322' }}>
          {amount?.toFixed(2) || 0} DT
        </span>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      width: 150,
      render: (message: string, record: BulletinSoinItem) => (
        message ? (
          <Tooltip title={`Code: ${record.codeMessage} - ${message}`}>
            <Tag color={record.codeMessage?.startsWith('OK') ? 'green' : 'orange'}>
              {record.codeMessage}
            </Tag>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: 'Acuité',
      key: 'acuite',
      width: 100,
      render: (_: any, record: BulletinSoinItem) => (
        record.acuiteDroite || record.acuiteGauche ? (
          <div style={{ fontSize: '12px' }}>
            <div>D: {record.acuiteDroite || '-'}</div>
            <div>G: {record.acuiteGauche || '-'}</div>
          </div>
        ) : '-'
      ),
    },
    {
      title: 'Commentaire',
      dataIndex: 'commentaire',
      key: 'commentaire',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (comment: string) => (
        comment ? (
          <Tooltip title={comment}>
            <span>{comment}</span>
          </Tooltip>
        ) : '-'
      ),
    },
  ];

  const totalDepense = items.reduce((sum, item) => sum + (item.depense || 0), 0);
  const totalPec = items.reduce((sum, item) => sum + (item.pec || 0), 0);
  const totalParticipation = items.reduce((sum, item) => sum + (item.participationAdherent || 0), 0);

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Détail des prestations ({items.length} ligne{items.length > 1 ? 's' : ''})</h3>
      
      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 1400 }}
        summary={() => (
          <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
            <Table.Summary.Cell index={0} colSpan={6}>
              <strong>TOTAUX</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <strong>{totalDepense.toFixed(2)} DT</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="right">
              <strong style={{ color: '#3f8600' }}>
                {totalPec.toFixed(2)} DT
              </strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8} align="right">
              <strong style={{ color: '#cf1322' }}>
                {totalParticipation.toFixed(2)} DT
              </strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={9} colSpan={3} />
          </Table.Summary.Row>
        )}
      />
      
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        backgroundColor: '#f6ffed', 
        border: '1px solid #b7eb8f',
        borderRadius: 6 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span><strong>Total dépenses:</strong> {totalDepense.toFixed(2)} DT</span>
          <span><strong>Total PEC:</strong> <span style={{ color: '#3f8600' }}>{totalPec.toFixed(2)} DT</span></span>
          <span><strong>Participation adhérent:</strong> <span style={{ color: '#cf1322' }}>{totalParticipation.toFixed(2)} DT</span></span>
          <span><strong>Économie:</strong> <span style={{ color: '#1890ff' }}>{(totalDepense - totalPec).toFixed(2)} DT</span></span>
        </div>
      </div>
    </div>
  );
};