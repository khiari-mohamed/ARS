import React, { useState, useEffect } from 'react';
import { Modal, Button, Upload, Table, Tag, Progress, message, Tabs, Form, Input, Select, InputNumber, Checkbox, Space, Popconfirm } from 'antd';
import { UploadOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { updateBordereau, fetchBordereau, fetchBSList, updateBSStatus, bulkUpdateBS, recalculateBordereauProgress } from '../services/bordereauxService';
import { fetchClients } from '../services/clientService';
import { fetchContracts } from '../services/contractService';

const { TabPane } = Tabs;
const { Option } = Select;

interface BordereauEditModalProps {
  bordereauId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BordereauEditModal: React.FC<BordereauEditModalProps> = ({
  bordereauId,
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [bordereau, setBordereau] = useState<any>(null);
  const [bsList, setBsList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [selectedBSIds, setSelectedBSIds] = useState<string[]>([]);
  const [editingBS, setEditingBS] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [bsForm] = Form.useForm();
  
  const calculateProgress = (bsData: any[]) => {
    const total = bsData.length;
    const traites = bsData.filter(bs => bs.etat === 'VALIDATED').length;
    const rejetes = bsData.filter(bs => bs.etat === 'REJECTED').length;
    const enCours = total - traites - rejetes;
    const completionRate = total > 0 ? Math.round(((traites + rejetes) / total) * 100) : 0;
    
    let scanStatus = 'NON_SCANNE';
    if (completionRate > 0 && completionRate < 100) scanStatus = 'SCAN_EN_COURS';
    if (completionRate === 100) scanStatus = 'SCAN_FINALISE';
    
    return { total, traites, rejetes, enCours, completionRate, scanStatus };
  };

  useEffect(() => {
    if (open && bordereauId) {
      loadData();
    }
  }, [open, bordereauId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bordereauxData, bsData, clientsData, contractsData] = await Promise.all([
        fetchBordereau(bordereauId),
        fetchBSList(bordereauId),
        fetchClients(),
        fetchContracts()
      ]);
      
      setBordereau(bordereauxData);
      setBsList(bsData || []);
      setClients(clientsData || []);
      setContracts(contractsData || []);
      
      // Calculate progress
      const progress = calculateProgress(bsData || []);
      setProgressData(progress);
      
      // Populate form
      form.setFieldsValue({
        reference: bordereauxData.reference,
        clientId: bordereauxData.clientId,
        contractId: bordereauxData.contractId,
        nombreBS: bordereauxData.nombreBS,
        delaiReglement: bordereauxData.delaiReglement
      });
    } catch (error) {
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleBordereauUpdate = async (values: any) => {
    setLoading(true);
    try {
      await updateBordereau(bordereauId, values);
      message.success('Bordereau modifié avec succès');
      await loadData();
      onSuccess();
    } catch (error) {
      message.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleMultipleBSUpload = async (fileList: any[]) => {
    if (fileList.length === 0) return;
    
    setUploading(true);
    try {
      const files = fileList.map(file => file.originFileObj || file);
      
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/bordereaux/${bordereauId}/bs/upload-multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success(`${result.bsCreated} BS uploadés avec succès`);
        await loadData();
      } else {
        message.error(result.error || 'Erreur lors de l\'upload des BS');
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleBSStatusUpdate = async (bsId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bordereaux/bs/${bsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ etat: newStatus })
      });
      
      if (response.ok) {
        message.success('Statut BS mis à jour');
        await loadData();
        await recalculateBordereauProgress(bordereauId);
      } else {
        message.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const handleBulkBSUpdate = async (status: string) => {
    if (selectedBSIds.length === 0) {
      message.warning('Sélectionnez au moins un BS');
      return;
    }
    
    try {
      const updates = selectedBSIds.map(bsId => ({ bsId, data: { etat: status } }));
      await bulkUpdateBS(bordereauId, updates);
      message.success(`${selectedBSIds.length} BS mis à jour`);
      setSelectedBSIds([]);
      await loadData();
      await recalculateBordereauProgress(bordereauId);
    } catch (error) {
      message.error('Erreur lors de la mise à jour en lot');
    }
  };

  const handleBSEdit = async (bsId: string, values: any) => {
    try {
      const response = await fetch(`/api/bordereaux/bs/${bsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });
      
      if (response.ok) {
        message.success('BS modifié avec succès');
        setEditingBS(null);
        await loadData();
        await recalculateBordereauProgress(bordereauId);
      } else {
        message.error('Erreur lors de la modification du BS');
      }
    } catch (error) {
      message.error('Erreur lors de la modification du BS');
    }
  };

  const bsColumns = [
    {
      title: 'Sélection',
      key: 'selection',
      width: 60,
      render: (_: any, record: any) => (
        <Checkbox
          checked={selectedBSIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedBSIds([...selectedBSIds, record.id]);
            } else {
              setSelectedBSIds(selectedBSIds.filter(id => id !== record.id));
            }
          }}
        />
      )
    },
    {
      title: 'Référence',
      dataIndex: 'numBs',
      key: 'numBs',
      render: (text: string, record: any) => record.numBs || `BS-${record.id?.slice(-4)}`
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      render: (montant: number, record: any) => {
        if (editingBS === record.id) {
          return (
            <InputNumber
              value={montant || 0}
              min={0}
              step={0.01}
              formatter={(value) => `${value} TND`}
              parser={(value) => parseFloat(value!.replace(' TND', '')) || 0}
              onChange={(value) => {
                // Update the record temporarily for UI
                const updatedList = bsList.map(bs => 
                  bs.id === record.id ? { ...bs, montant: value } : bs
                );
                setBsList(updatedList);
              }}
              onBlur={async () => {
                // Save to backend when user finishes editing
                try {
                  const response = await fetch(`/api/bordereaux/bs/${record.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ montant: record.montant })
                  });
                  
                  if (response.ok) {
                    message.success('Montant mis à jour');
                  }
                } catch (error) {
                  message.error('Erreur lors de la mise à jour du montant');
                }
              }}
            />
          );
        }
        return montant ? `${montant.toFixed(2)} TND` : 'N/A';
      }
    },
    {
      title: 'Statut',
      dataIndex: 'etat',
      key: 'etat',
      render: (etat: string, record: any) => {
        if (editingBS === record.id) {
          return (
            <Select
              value={etat}
              style={{ width: 120 }}
              onChange={(value) => handleBSStatusUpdate(record.id, value)}
            >
              <Option value="IN_PROGRESS">En cours</Option>
              <Option value="VALIDATED">Validé</Option>
              <Option value="REJECTED">Rejeté</Option>
            </Select>
          );
        }
        return (
          <Tag color={etat === 'VALIDATED' ? 'green' : etat === 'REJECTED' ? 'red' : 'blue'}>
            {etat === 'VALIDATED' ? 'Validé' : etat === 'REJECTED' ? 'Rejeté' : 'En cours'}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingBS(editingBS === record.id ? null : record.id)}
          />
          <Popconfirm
            title="Supprimer ce BS?"
            onConfirm={() => handleBSStatusUpdate(record.id, 'REJECTED')}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Modal
      title={`Modifier le bordereau ${bordereau?.reference || ''}`}
      open={open}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Annuler
        </Button>,
        <Button key="save" type="primary" onClick={() => form.submit()} loading={loading}>
          Sauvegarder
        </Button>
      ]}
    >

      <Tabs defaultActiveKey="1">
        <TabPane tab="📊 Informations Générales" key="1">
          <Form form={form} onFinish={handleBordereauUpdate} layout="vertical">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="reference" label="Référence" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="clientId" label="Client" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner un client">
                  {clients.map(client => (
                    <Option key={client.id} value={client.id}>{client.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="contractId" label="Contrat">
                <Select placeholder="Sélectionner un contrat">
                  {contracts.map(contract => (
                    <Option key={contract.id} value={contract.id}>{contract.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="nombreBS" label="Nombre de BS">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="delaiReglement" label="Délai de règlement (jours)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </Form>
        </TabPane>
        
        <TabPane tab="📋 Gestion des BS" key="2">
          {progressData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-semibold mb-3">📊 Progression</h4>
              <Progress percent={progressData.completionRate} className="mb-3" />
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{progressData.traites}</div>
                  <div className="text-sm text-gray-600">Traités</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{progressData.rejetes}</div>
                  <div className="text-sm text-gray-600">Rejetés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{progressData.enCours}</div>
                  <div className="text-sm text-gray-600">En cours</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mb-4 flex gap-2 flex-wrap">
            <Upload
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              beforeUpload={() => false}
              onChange={({ fileList }) => handleMultipleBSUpload(fileList)}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                📤 Upload Multiple BS
              </Button>
            </Upload>
            
            {selectedBSIds.length > 0 && (
              <>
                <Button onClick={() => handleBulkBSUpdate('VALIDATED')} type="primary">
                  ✅ Valider Sélectionnés ({selectedBSIds.length})
                </Button>
                <Button onClick={() => handleBulkBSUpdate('REJECTED')} danger>
                  ❌ Rejeter Sélectionnés ({selectedBSIds.length})
                </Button>
                <Button onClick={() => handleBulkBSUpdate('IN_PROGRESS')}>
                  🔄 Remettre En Cours ({selectedBSIds.length})
                </Button>
              </>
            )}
            
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              🔄 Actualiser
            </Button>
          </div>
          
          <Table
            columns={bsColumns}
            dataSource={bsList}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 800 }}
          />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default BordereauEditModal;