import React, { useState } from 'react';
import { Table, Tag, Button, Space, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useBSList } from '../../hooks/useBS';
import { useNavigate } from 'react-router-dom';
import { BSStatusTag } from './BSStatusTag';
import { BSDetailsModal } from './BSDetailsModal';

// Define the expected data type for useBSList
type BSListData = {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const BSList: React.FC<{ params: any; onParamsChange?: (params: any) => void }> = ({ params, onParamsChange }) => {
  const { data, isLoading, error } = useBSList(params) as { data: BSListData | undefined; isLoading: boolean; error: any };
  const navigate = useNavigate();
  const [modalState, setModalState] = useState<{ open: boolean; bsId: string | null; mode: 'view' | 'edit' }>({ 
    open: false, 
    bsId: null, 
    mode: 'view' 
  });

  const columns = [
    {
      title: 'Numéro BS',
      dataIndex: 'numBs',
      key: 'numBs',
      width: 120,
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Assuré',
      dataIndex: 'nomAssure',
      key: 'nomAssure',
      width: 150
    },
    {
      title: 'Bénéficiaire',
      dataIndex: 'nomBeneficiaire',
      key: 'nomBeneficiaire',
      width: 150
    },
    {
      title: 'Prestataire',
      dataIndex: 'nomPrestation',
      key: 'nomPrestation',
      width: 180
    },
    {
      title: 'Date création',
      dataIndex: 'dateCreation',
      key: 'dateCreation',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('fr-FR') : '-'
    },
    {
      title: 'Date limite',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => {
        if (!date) return '-';
        const dueDate = new Date(date);
        const isOverdue = dueDate < new Date();
        return (
          <Tag color={isOverdue ? 'red' : 'orange'}>
            {dueDate.toLocaleDateString('fr-FR')}
          </Tag>
        );
      }
    },
    {
      title: 'Montant',
      dataIndex: 'totalPec',
      key: 'totalPec',
      width: 100,
      render: (amount: number) => amount ? `${amount.toFixed(3)} DT` : '-'
    },
    {
      title: 'Statut',
      dataIndex: 'etat',
      key: 'etat',
      width: 120,
      render: (etat: string) => <BSStatusTag status={etat as any} />
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setModalState({ open: true, bsId: record.id, mode: 'view' });
              }}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setModalState({ open: true, bsId: record.id, mode: 'edit' });
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Erreur lors du chargement des données</p>
        <Button onClick={() => window.location.reload()}>Actualiser</Button>
      </div>
    );
  }

  return (
    <div>
      <BSDetailsModal
        bsId={modalState.bsId}
        mode={modalState.mode}
        open={modalState.open}
        onClose={() => setModalState({ open: false, bsId: null, mode: 'view' })}
      />
      
      <Table
        loading={isLoading}
        dataSource={data?.items || []}
        columns={columns}
        rowKey="id"
        pagination={{
          current: data?.page || 1,
          pageSize: data?.limit || 20,
          total: data?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} BS`,
          onChange: (page, pageSize) => onParamsChange && onParamsChange({ ...params, page, limit: pageSize }),
        }}
        onRow={record => ({
          onClick: () => navigate(`/home/bs/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        scroll={{ x: 1200 }}
        size="middle"
      />
    </div>
  );
};

export default BSList;