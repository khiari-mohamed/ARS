import React from 'react';
import { Table } from 'antd';
import { BulletinSoinItem } from '../../types/bs';

export const BSItemsTable: React.FC<{ items: BulletinSoinItem[] }> = ({ items }) => (
  <Table
    dataSource={items}
    rowKey="id"
    size="small"
    pagination={false}
    scroll={{ x: true }}
    columns={[
      { title: 'Produit', dataIndex: 'nomProduit', key: 'nomProduit' },
      { title: 'Quantité', dataIndex: 'quantite', key: 'quantite' },
      { title: 'Chapitre', dataIndex: 'nomChapitre', key: 'nomChapitre' },
      { title: 'Prestataire', dataIndex: 'nomPrestataire', key: 'nomPrestataire' },
      { title: 'Date', dataIndex: 'datePrestation', key: 'datePrestation', render: d => d && new Date(d).toLocaleDateString() },
      { title: 'Dépense', dataIndex: 'depense', key: 'depense' },
      { title: 'PEC', dataIndex: 'pec', key: 'pec' },
      { title: 'Part. Adh.', dataIndex: 'participationAdherent', key: 'participationAdherent' },
      { title: 'Message', dataIndex: 'message', key: 'message' },
    ]}
  />
);
