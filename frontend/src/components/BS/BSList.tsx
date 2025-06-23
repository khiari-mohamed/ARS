import React from 'react';
import { Table, Input, Space } from 'antd';
import { useBSList } from '../../hooks/useBS';
import { useNavigate } from 'react-router-dom';
import { BSStatusTag } from './BSStatusTag';

// Define the expected data type for useBSList
type BSListData = {
  items: any[];
  total: number;
  // add other properties if needed
};

const BSList: React.FC<{ params: any; onParamsChange?: (params: any) => void }> = ({ params, onParamsChange }) => {
  const { data, isLoading } = useBSList(params) as { data: BSListData | undefined; isLoading: boolean };
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Recherche BS, assuré, bénéficiaire..."
          onSearch={v => onParamsChange && onParamsChange({ ...params, search: v, page: 1 })}
          allowClear
        />
      </Space>
      <Table
        loading={isLoading}
        dataSource={data?.items || []}
        rowKey="id"
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: data?.total,
          onChange: page => onParamsChange && onParamsChange({ ...params, page }),
        }}
        onRow={record => ({
          onClick: () => navigate(`/bs/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Numéro', dataIndex: 'numBs', key: 'numBs' },
          { title: 'Assuré', dataIndex: 'nomAssure', key: 'nomAssure' },
          { title: 'Bénéficiaire', dataIndex: 'nomBeneficiaire', key: 'nomBeneficiaire' },
          { title: 'Prestataire', dataIndex: 'nomPrestation', key: 'nomPrestation' },
          { title: 'Date', dataIndex: 'dateCreation', key: 'dateCreation', render: d => d && new Date(d).toLocaleDateString() },
          { title: 'Statut', dataIndex: 'etat', key: 'etat', render: (etat) => <BSStatusTag status={etat} /> },
        ]}
        scroll={{ x: true }}
      />
    </div>
  );
};

export default BSList;