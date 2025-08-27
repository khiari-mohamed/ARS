import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, message, Tabs, Descriptions, Tag } from 'antd';
import { useBSDetails, useUpdateBS } from '../../hooks/useBS';
import { BSStatusTag } from './BSStatusTag';
import dayjs from 'dayjs';

interface BSDetailsModalProps {
  bsId: string | null;
  mode: 'view' | 'edit';
  open: boolean;
  onClose: () => void;
}

export const BSDetailsModal: React.FC<BSDetailsModalProps> = ({ bsId, mode, open, onClose }) => {
  const [form] = Form.useForm();
  const [editMode, setEditMode] = useState(mode === 'edit');
  const { data: bs, isLoading } = useBSDetails(bsId!);
  const updateMutation = useUpdateBS();

  useEffect(() => {
    if (bs && open) {
      form.setFieldsValue({
        numBs: bs.numBs,
        nomAssure: bs.nomAssure,
        nomBeneficiaire: bs.nomBeneficiaire,
        nomPrestation: bs.nomPrestation,
        dateCreation: bs.dateCreation ? dayjs(bs.dateCreation) : null,
        dueDate: (bs as any).dueDate ? dayjs((bs as any).dueDate) : null,
        totalPec: bs.totalPec,
        etat: bs.etat,
        codeAssure: bs.codeAssure,
        codeBeneficiaire: (bs as any).codeBeneficiaire,
        observations: (bs as any).observations
      });
    }
  }, [bs, open, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({
        id: bsId!,
        ...values,
        dateCreation: values.dateCreation?.toDate(),
        dueDate: values.dueDate?.toDate()
      });
      message.success('BS mis à jour avec succès');
      setEditMode(false);
      onClose();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const statusOptions = [
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'VALIDATED', label: 'Validé' },
    { value: 'REJECTED', label: 'Rejeté' },
    { value: 'CLOTURE', label: 'Clôturé' }
  ];

  const renderViewMode = () => (
    <Descriptions column={2} bordered>
      <Descriptions.Item label="Numéro BS">{bs?.numBs || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Statut">
        <BSStatusTag status={bs?.etat as any || 'IN_PROGRESS'} />
      </Descriptions.Item>
      <Descriptions.Item label="Assuré">{bs?.nomAssure || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Code Assuré">{bs?.codeAssure || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Bénéficiaire">{bs?.nomBeneficiaire || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Code Bénéficiaire">{(bs as any)?.codeBeneficiaire || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Prestataire">{bs?.nomPrestation || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Montant">
        {bs?.totalPec ? `${Number(bs.totalPec).toFixed(3)} DT` : 'N/A'}
      </Descriptions.Item>
      <Descriptions.Item label="Date création">
        {bs?.dateCreation ? dayjs(bs.dateCreation).format('DD/MM/YYYY') : 'N/A'}
      </Descriptions.Item>
      <Descriptions.Item label="Date limite">
        {(bs as any)?.dueDate ? (
          <Tag color={dayjs((bs as any).dueDate).isBefore(dayjs()) ? 'red' : 'orange'}>
            {dayjs((bs as any).dueDate).format('DD/MM/YYYY')}
          </Tag>
        ) : 'N/A'}
      </Descriptions.Item>
      <Descriptions.Item label="Observations" span={2}>
        {(bs as any)?.observations || 'Aucune observation'}
      </Descriptions.Item>
    </Descriptions>
  );

  const renderEditMode = () => (
    <Form form={form} layout="vertical">
      <Form.Item label="Numéro BS" name="numBs" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      
      <Form.Item label="Statut" name="etat" rules={[{ required: true }]}>
        <Select options={statusOptions} />
      </Form.Item>

      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item label="Assuré" name="nomAssure" style={{ flex: 1 }}>
          <Input />
        </Form.Item>
        <Form.Item label="Code Assuré" name="codeAssure" style={{ flex: 1 }}>
          <Input />
        </Form.Item>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item label="Bénéficiaire" name="nomBeneficiaire" style={{ flex: 1 }}>
          <Input />
        </Form.Item>
        <Form.Item label="Code Bénéficiaire" name="codeBeneficiaire" style={{ flex: 1 }}>
          <Input />
        </Form.Item>
      </div>

      <Form.Item label="Prestataire" name="nomPrestation">
        <Input />
      </Form.Item>

      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item label="Date création" name="dateCreation" style={{ flex: 1 }}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Date limite" name="dueDate" style={{ flex: 1 }}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
      </div>

      <Form.Item label="Montant (DT)" name="totalPec">
        <InputNumber
          min={0}
          precision={3}
          style={{ width: '100%' }}
          formatter={value => `${value} DT`}
          parser={value => parseFloat(value!.replace(' DT', '')) as any}
        />
      </Form.Item>

      <Form.Item label="Observations" name="observations">
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );

  return (
    <Modal
      title={`BS ${bs?.numBs || ''} - ${editMode ? 'Modification' : 'Détails'}`}
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Fermer
        </Button>,
        !editMode && (
          <Button key="edit" type="primary" onClick={() => setEditMode(true)}>
            Modifier
          </Button>
        ),
        editMode && (
          <Button key="save" type="primary" loading={updateMutation.isPending} onClick={handleSave}>
            Sauvegarder
          </Button>
        )
      ].filter(Boolean)}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
      ) : editMode ? (
        renderEditMode()
      ) : (
        renderViewMode()
      )}
    </Modal>
  );
};