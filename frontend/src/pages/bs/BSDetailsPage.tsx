import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBSDetails, usePaymentStatus, useSlaAlerts, useNotifications } from '../../hooks/useBS';
import { Card, Descriptions, Button, Space, Tag, Typography } from 'antd';
import { BSStatusTag } from '../../components/BS/BSStatusTag';
import { BSItemsTable } from '../../components/BS/BSItemsTable';
import { BSDocumentViewer } from '../../components/BS/BSDocumentViewer';
import { BSLogs } from '../../components/BS/BSLogs';
import { BSOcrViewer } from '../../components/BS/BSOcrViewer';
import { BSExpertise } from '../../components/BS/BSExpertise';
import { PaymentStatusBadge } from '../../components/BS/PaymentStatusBadge';
import { NotificationCenter } from '../../components/BS/NotificationCenter';

import type { BSStatus } from '../../types/bs';

type BS = {
  id: number;
  numBs: string;
  etat: BSStatus;
  nomAssure: string;
  nomBeneficiaire: string;
  nomSociete: string;
  nomPrestation: string;
  dateCreation: string;
  dateMaladie?: string;
  totalPec: number;
  observationGlobal: string;
  items?: any[];
  lien: string;
  dueDate?: string;
};

const getSlaColor = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  if (due < now) return 'red';
  if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'orange';
  return 'green';
};

export const BSDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { data: bs, isLoading } = useBSDetails(Number(id)) as { data: BS | undefined; isLoading: boolean };
  const { data: paymentStatus } = usePaymentStatus(Number(id));
  const { data: slaAlerts } = useSlaAlerts();
  const { data: notifications } = useNotifications();
  const [docOpen, setDocOpen] = useState(false);
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Fetch managers (GESTIONNAIRE) from backend using LocalAPI
    import('../../services/axios').then(({ LocalAPI }) => {
      LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } })
        .then(res => setManagers(res.data || []))
        .catch(() => setManagers([]));
    });
  }, []);

  if (isLoading) return <Card loading />;
  if (!bs) return <Card>Introuvable</Card>;

  // Find if this BS is in SLA alerts
  const slaAlert = slaAlerts?.overdue?.find((a: any) => a.id === bs.id) || slaAlerts?.approaching?.find((a: any) => a.id === bs.id);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: 'auto' }}>
      <Card
        title={
          <Space>
            <span>BS #{bs.numBs}</span>
            <BSStatusTag status={bs.etat} />
            {bs.dueDate && (
              <Tag color={getSlaColor(bs.dueDate)}>
                Échéance: {new Date(bs.dueDate).toLocaleDateString()}
              </Tag>
            )}
            {paymentStatus && <PaymentStatusBadge status={paymentStatus.status} />}
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => navigate(`/bs/${bs.id}/processing`)} type="primary">
              Traiter
            </Button>
            <Button onClick={() => setDocOpen(true)}>Voir document</Button>
            <Button onClick={() => window.open('http://197.14.56.112:8083/api/bulletin-soin/export/excel', '_blank')}>
              Exporter Excel
            </Button>
          </Space>
        }
      >
        {slaAlert && (
          <Typography.Text type="danger">
            {slaAlert.dueDate < new Date().toISOString()
              ? '⚠️ Ce BS est en retard SLA !'
              : '⏰ Ce BS approche de la date limite SLA.'}
          </Typography.Text>
        )}
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Assuré">{bs.nomAssure}</Descriptions.Item>
          <Descriptions.Item label="Bénéficiaire">{bs.nomBeneficiaire}</Descriptions.Item>
          <Descriptions.Item label="Société">{bs.nomSociete}</Descriptions.Item>
          <Descriptions.Item label="Prestataire">{bs.nomPrestation}</Descriptions.Item>
          <Descriptions.Item label="Date création">{new Date(bs.dateCreation).toLocaleDateString()}</Descriptions.Item>
          <Descriptions.Item label="Date maladie">{bs.dateMaladie && new Date(bs.dateMaladie).toLocaleDateString()}</Descriptions.Item>
          <Descriptions.Item label="Total PEC">{bs.totalPec} DT</Descriptions.Item>
          <Descriptions.Item label="Observation">{bs.observationGlobal}</Descriptions.Item>
        </Descriptions>
        <BSItemsTable items={bs.items || []} />
        <BSExpertise bsId={bs.id} />
        <BSLogs bsId={bs.id} />
        <BSOcrViewer bsId={bs.id} />
        <NotificationCenter notifications={notifications || []} />
      </Card>
      <BSDocumentViewer url={bs.lien} open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
  );
};