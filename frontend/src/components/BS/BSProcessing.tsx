import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBSDetails, useUpdateBS, usePaymentStatus, useSlaAlerts } from '../../hooks/useBS';
import { Card, Button, Space, message, Popconfirm, Input, Tag, Typography } from 'antd';
import { BSStatusTag } from './BSStatusTag';
import { BSItemsTable } from './BSItemsTable';
import { BSDocumentViewer } from './BSDocumentViewer';
import { BSLogs } from './BSLogs';
import { BSOcrViewer } from './BSOcrViewer';
import { BSExpertise } from './BSExpertise';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { BSStatus } from '../../types/bordereaux';

const getSlaColor = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  if (due < now) return 'red';
  if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'orange';
  return 'green';
};

const BSProcessing: React.FC = () => {
  const { id } = useParams();
  type BS = {
    id: number;
    numBs: string;
    etat: BSStatus;
    lien: string;
    items: any[];
    dueDate?: string;
  };

  const { data: bs, isLoading } = useBSDetails(Number(id)) as { data: BS | undefined, isLoading: boolean };
  const { data: paymentStatus } = usePaymentStatus(Number(id));
  const { data: slaAlerts } = useSlaAlerts();
  const updateBS = useUpdateBS();
  const [docOpen, setDocOpen] = useState(false);
  const [observation, setObservation] = useState('');
  const navigate = useNavigate();

  const handleAction = async (etat: BSStatus) => {
    await updateBS.mutateAsync({ id: Number(id), etat, observationGlobal: observation } as any);
    message.success('Statut mis à jour');
    navigate(`/bs/${id}`);
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
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => setDocOpen(true)}>Voir document</Button>
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
        <Input.TextArea
          rows={3}
          placeholder="Ajouter une observation (optionnel)"
          value={observation}
          onChange={e => setObservation(e.target.value)}
          style={{ marginTop: 16, marginBottom: 16 }}
        />
        <Space>
          <Popconfirm
            title="Valider ce BS ?"
            onConfirm={() => handleAction('VALIDATED' as BSStatus)}
          >
            <Button type="primary">Valider</Button>
          </Popconfirm>
          <Popconfirm
            title="Rejeter ce BS ?"
            onConfirm={() => handleAction('REJECTED' as BSStatus)}
          >
            <Button danger>Rejeter</Button>
          </Popconfirm>
          <Popconfirm
            title="Retourner ce BS ?"
            onConfirm={() => handleAction('IN_PROGRESS' as BSStatus)}
          >
            <Button>Retourner</Button>
          </Popconfirm>
        </Space>
      </Card>
      <BSDocumentViewer url={bs.lien} open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
  );
};

export default BSProcessing;