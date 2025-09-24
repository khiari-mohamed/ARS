import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Form, Input, Select, Button, DatePicker, message, Alert } from 'antd';
import { 
  FileAddOutlined, 
  ScanOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useBSList } from '../../hooks/useBS';
import BOInterfaceForm from '../../components/BOInterfaceForm';
import DocumentEntryForm from '../../components/DocumentEntryForm';

const { Option } = Select;

interface BOFormData {
  typeFichier: string;
  nombreFichiers: number;
  referenceBordereau: string;
  delaiReglement: number;
  gestionnaireEnCharge: string;
}

const BODashboard: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showInterfaceForm, setShowInterfaceForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  
  const { data: bsData } = useBSList({ limit: 100 });
  const bsList = bsData?.items || [];
  
  // Statistics
  const todayRegistered = bsList.filter(bs => {
    const today = new Date().toDateString();
    return new Date(bs.dateCreation).toDateString() === today;
  }).length;
  
  const pendingScan = bsList.filter(bs => bs.etat === 'A_SCANNER' as any).length;
  const inProgress = bsList.filter(bs => bs.etat === 'IN_PROGRESS').length;
  const completed = bsList.filter(bs => bs.etat === 'VALIDATED').length;

  const handleSubmit = async (values: BOFormData) => {
    setLoading(true);
    try {
      // Create bordereau with BS type
      const { LocalAPI } = await import('../../services/axios');
      await LocalAPI.post('/bordereaux', {
        ...values,
        typeFichier: 'BS',
        dateReception: new Date(),
        statut: 'A_SCANNER'
      });
      
      message.success('Bordereau BS enregistré avec succès');
      form.resetFields();
    } catch (error) {
      message.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Bureau d'Ordre - Enregistrement BS</h1>
      
      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Enregistrés aujourd'hui"
              value={todayRegistered}
              prefix={<FileAddOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En attente scan"
              value={pendingScan}
              prefix={<ScanOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En cours"
              value={inProgress}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Traités"
              value={completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="Enregistrement Bordereau BS">
            <Alert
              type="info"
              message="Enregistrement des Bulletins de Soins"
              description="Saisissez les informations du bordereau contenant les BS. Les valeurs par défaut seront récupérées depuis le module Client."
              style={{ marginBottom: 24 }}
              showIcon
            />
            
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                typeFichier: 'BS',
                delaiReglement: 30
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Type de fichier"
                    name="typeFichier"
                    rules={[{ required: true }]}
                  >
                    <Select disabled>
                      <Option value="BS">Bulletin de Soins (BS)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Nombre de BS reçus"
                    name="nombreFichiers"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <Input type="number" placeholder="Nombre de BS dans le bordereau" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Référence du bordereau"
                    name="referenceBordereau"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="REF-BS-YYYY-XXXX" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Délais contractuels de règlement (jours)"
                    name="delaiReglement"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <Input type="number" placeholder="Sera pré-rempli depuis le Client" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Gestionnaire en charge"
                name="gestionnaireEnCharge"
                rules={[{ required: true }]}
              >
                <Select placeholder="Sera suggéré automatiquement via profil client">
                  <Option value="gestionnaire1">Gestionnaire 1</Option>
                  <Option value="gestionnaire2">Gestionnaire 2</Option>
                  <Option value="gestionnaire3">Gestionnaire 3</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  size="large"
                  style={{ marginRight: 8 }}
                >
                  Enregistrer Bordereau BS
                </Button>
                <Button 
                  type="default" 
                  onClick={() => setShowInterfaceForm(true)}
                  size="large"
                  style={{ marginRight: 8 }}
                >
                  Interface Améliorée
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => setShowDocumentForm(true)}
                  size="large"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  📄 Nouveau Document
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="Instructions">
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <h4>Processus d'enregistrement:</h4>
              <ol>
                <li>Saisir le type de fichier (BS)</li>
                <li>Indiquer le nombre de BS reçus</li>
                <li>Référencer le bordereau</li>
                <li>Confirmer les délais contractuels</li>
                <li>Valider le gestionnaire suggéré</li>
              </ol>
              
              <h4>Après enregistrement:</h4>
              <ul>
                <li>Notification automatique à l'équipe SCAN</li>
                <li>Création du dossier de suivi</li>
                <li>Démarrage du chronomètre SLA</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* Enhanced BO Interface Form */}
      <BOInterfaceForm
        open={showInterfaceForm}
        onClose={() => setShowInterfaceForm(false)}
        onSuccess={() => {
          message.success('Bordereau créé avec succès et notification envoyée au SCAN');
          // Refresh data if needed
        }}
      />
      
      {/* Document Entry Form */}
      <DocumentEntryForm
        open={showDocumentForm}
        onClose={() => setShowDocumentForm(false)}
        onSuccess={() => {
          message.success('Document créé avec succès et prêt pour scan');
          setShowDocumentForm(false);
        }}
      />
    </div>
  );
};

export default BODashboard;