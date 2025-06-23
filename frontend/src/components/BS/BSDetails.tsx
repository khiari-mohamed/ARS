import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBSDetails, usePaymentStatus } from '../../hooks/useBS';
import { Card, Descriptions, Button, Space, Tag } from 'antd';
import { BSStatusTag } from './BSStatusTag';
import { BSItemsTable } from './BSItemsTable';
import { BSDocumentViewer } from './BSDocumentViewer';
import { BSLogs } from './BSLogs';
import { BSOcrViewer } from './BSOcrViewer';
import { BSExpertise } from './BSExpertise';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { BSStatus } from '../../types/bordereaux';

type BS = {
  id: number;
  numBs: string;
  etat: string;
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

const BSDetails: React.FC = () => {
  const { id } = useParams();
  const { data: bs, isLoading } = useBSDetails(Number(id)) as { data: BS | undefined, isLoading: boolean };
  const { data: paymentStatus } = usePaymentStatus(Number(id));
  const [docOpen, setDocOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading) return <Card loading />;
  if (!bs) return <Card>Introuvable</Card>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: 'auto' }}>
      <Card
        title={
          <Space>
            <span>BS #{bs.numBs}</span>
            <BSStatusTag status={bs.etat as BSStatus} />
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
          </Space>
        }
      >
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
      </Card>
      <BSDocumentViewer url={bs.lien} open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
  );
};

export default BSDetails;