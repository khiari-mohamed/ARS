import React from 'react';
import { Modal, Button } from 'antd';

export const BSDocumentViewer: React.FC<{ url: string; open: boolean; onClose: () => void }> = ({
  url,
  open,
  onClose,
}) => (
  <Modal open={open} onCancel={onClose} footer={null} width="80vw" style={{ top: 20 }}>
    <iframe
      src={url}
      title="Document"
      style={{ width: '100%', height: '70vh', border: 'none' }}
      allowFullScreen
    />
    <Button onClick={onClose} style={{ marginTop: 8 }}>
      Fermer
    </Button>
  </Modal>
);
