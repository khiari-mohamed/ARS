import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Table, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useBSExpertise, useUpdateBS } from '../../hooks/useBS';
import { ExpertiseInfo } from '../../types/bs';

const { Option } = Select;

interface BSExpertiseProps {
  bsId: number | string;
}

export const BSExpertise: React.FC<BSExpertiseProps> = ({ bsId }) => {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { data: expertises, refetch } = useBSExpertise(bsId);
  const updateBS = useUpdateBS();

  const handleSubmit = async (values: any) => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      
      if (editingId) {
        await LocalAPI.put(`/bulletin-soin/${bsId}/expertise/${editingId}`, values);
      } else {
        await LocalAPI.post(`/bulletin-soin/${bsId}/expertise`, values);
      }
      
      message.success('Expertise mise à jour');
      form.resetFields();
      setEditing(false);
      setEditingId(null);
      refetch();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const handleEdit = (expertise: ExpertiseInfo) => {
    form.setFieldsValue(expertise);
    setEditingId(expertise.id?.toString() || null);
    setEditing(true);
  };

  const columns = [
    {
      title: 'Favorable',
      dataIndex: 'isFavorable',
      key: 'isFavorable',
      render: (value: string) => (
        <Tag color={value === 'FAVORABLE' ? 'green' : value === 'DEFAVORABLE' ? 'red' : 'orange'}>
          {value}
        </Tag>
      ),
    },
    {
      title: 'Matricule',
      dataIndex: 'matriculeAdherent',
      key: 'matriculeAdherent',
    },
    {
      title: 'Contrat',
      dataIndex: 'contrat',
      key: 'contrat',
    },
    {
      title: 'Nature acte',
      dataIndex: 'natureActe',
      key: 'natureActe',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ExpertiseInfo) => (
        <Button 
          size="small" 
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Modifier
        </Button>
      ),
    },
  ];

  return (
    <Card 
      title="Expertise médicale" 
      style={{ marginTop: 24 }}
      extra={
        !editing && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setEditing(true)}
          >
            Ajouter expertise
          </Button>
        )
      }
    >
      {editing && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginBottom: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 6 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Form.Item
              label="Avis"
              name="isFavorable"
              rules={[{ required: true }]}
            >
              <Select placeholder="Sélectionner un avis">
                <Option value="EN_COURS">En cours</Option>
                <Option value="FAVORABLE">Favorable</Option>
                <Option value="DEFAVORABLE">Défavorable</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Matricule adhérent"
              name="matriculeAdherent"
              rules={[{ required: true }]}
            >
              <Input placeholder="Matricule" />
            </Form.Item>

            <Form.Item
              label="Numéro BS"
              name="numBS"
              rules={[{ required: true }]}
            >
              <Input placeholder="Numéro BS" />
            </Form.Item>

            <Form.Item
              label="Contrat"
              name="contrat"
              rules={[{ required: true }]}
            >
              <Input placeholder="Référence contrat" />
            </Form.Item>

            <Form.Item
              label="CIN"
              name="cin"
            >
              <Input placeholder="Numéro CIN" />
            </Form.Item>

            <Form.Item
              label="Nature de l'acte"
              name="natureActe"
            >
              <Input placeholder="Nature de l'acte" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => {
              setEditing(false);
              setEditingId(null);
              form.resetFields();
            }}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </Form>
      )}

      <Table
        dataSource={expertises || []}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'Aucune expertise enregistrée' }}
      />
    </Card>
  );
};