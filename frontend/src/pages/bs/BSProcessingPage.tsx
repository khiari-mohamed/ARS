import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBSDetails, useUpdateBS, usePaymentStatus, useSlaAlerts, useNotifications } from '../../hooks/useBS';
import { Card, Button, Space, message, Popconfirm, Tag, Typography } from 'antd';
import { BSStatusTag } from '../../components/BS/BSStatusTag';
import { BSItemsTable } from '../../components/BS/BSItemsTable';
import { BSDocumentViewer } from '../../components/BS/BSDocumentViewer';
import { BSLogs } from '../../components/BS/BSLogs';
import { BSOcrViewer } from '../../components/BS/BSOcrViewer';
import { BSExpertise } from '../../components/BS/BSExpertise';
import { PaymentStatusBadge } from '../../components/BS/PaymentStatusBadge';
import { NotificationCenter } from '../../components/BS/NotificationCenter';
import { BSStatus } from '../../types/bs';
import { useQuery } from '@tanstack/react-query';

interface BSDetails {
  id: number;
  numBs: string;
  etat: BSStatus;
  items?: any[];
  lien: string;
  dueDate?: string;
}

const getSlaColor = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  if (due < now) return 'red';
  if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'orange';
  return 'green';
};

const useEscalationRisk = (bsId: number | string) =>
  useQuery(['escalation-risk', bsId], async () => {
    const res = await fetch(`https://197.14.56.112:8083/api/bulletin-soin/ai/escalation-risk/${bsId}`);
    return res.json();
  });

export const BSProcessingPage: React.FC = () => {
  const { id } = useParams();
  const { data: bs, isLoading } = useBSDetails(Number(id)) as {
    data: BSDetails | undefined,
    isLoading: boolean
  };
  const { data: paymentStatus } = usePaymentStatus(Number(id));
  const { data: slaAlerts } = useSlaAlerts();
  const { data: notifications } = useNotifications();
  const { data: escalationRisk } = useEscalationRisk(Number(id));
  const updateBS = useUpdateBS();
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

  const handleAction = async (etat: BSStatus) => {
    try {
      await updateBS.mutateAsync({ id: Number(id), etat });
      message.success('Statut mis à jour');
      navigate(`/bs/${id}`);
    } catch (error) {
      message.error('Erreur lors de la mise à jour du statut');
    }
  };

  if (isLoading) return <Card loading />;
  if (!bs) return <Card>Introuvable</Card>;

  // Find if this BS is in SLA alerts
  const slaAlert = slaAlerts?.overdue?.find((a: any) => a.id === bs.id) || slaAlerts?.approaching?.find((a: any) => a.id === bs.id);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: 'auto' }}>
      <Card
        title={
          <Space>
            <span>Traitement BS #{bs.numBs}</span>
            <BSStatusTag status={bs.etat} />
            {bs.dueDate && (
              <Tag color={getSlaColor(bs.dueDate)}>
                Échéance: {new Date(bs.dueDate).toLocaleDateString()}
              </Tag>
            )}
            {paymentStatus && <PaymentStatusBadge status={paymentStatus.status} />}
            {escalationRisk && (
              <Tag color={escalationRisk.risk === 'HIGH' ? 'red' : escalationRisk.risk === 'MEDIUM' ? 'orange' : 'green'}>
                Risque d'escalade IA: {escalationRisk.risk}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => setDocOpen(true)}>Voir document</Button>
            <Button onClick={() => window.open('https://197.14.56.112:8083/api/bulletin-soin/export/excel', '_blank')}>
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
        <BSItemsTable items={bs.items || []} />
        <BSExpertise bsId={bs.id} />
        <BSLogs bsId={bs.id} />
        <BSOcrViewer bsId={bs.id} />
        <NotificationCenter notifications={notifications || []} />
        <Space style={{ marginTop: 24 }}>
          <Popconfirm
            title="Valider ce BS ?"
            onConfirm={() => handleAction('VALIDATED')}
            okText="Oui"
            cancelText="Non"
          >
            <Button type="primary">Valider</Button>
          </Popconfirm>
          <Popconfirm
            title="Rejeter ce BS ?"
            onConfirm={() => handleAction('REJECTED')}
            okText="Oui"
            cancelText="Non"
          >
            <Button danger>Rejeter</Button>
          </Popconfirm>
          <Popconfirm
            title="Retourner ce BS ?"
            onConfirm={() => handleAction('IN_PROGRESS')}
            okText="Oui"
            cancelText="Non"
          >
            <Button>Retourner</Button>
          </Popconfirm>
        </Space>
      </Card>
      <BSDocumentViewer
        url={bs.lien}
        open={docOpen}
        onClose={() => setDocOpen(false)}
      />
    </div>
  );
};