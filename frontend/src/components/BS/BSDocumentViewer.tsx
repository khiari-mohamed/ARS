import React from 'react';
import { Modal, Spin, Alert } from 'antd';

interface BSDocumentViewerProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

export const BSDocumentViewer: React.FC<BSDocumentViewerProps> = ({
  url,
  open,
  onClose
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError('Impossible de charger le document');
  };

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
    }
  }, [open, url]);

  return (
    <Modal
      title="Visualisation du document BS"
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ top: 20 }}
      bodyStyle={{ height: '80vh', padding: 0 }}
    >
      {loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}>
          <Spin size="large" />
          <span style={{ marginLeft: 16 }}>Chargement du document...</span>
        </div>
      )}
      
      {error && (
        <div style={{ padding: 24 }}>
          <Alert
            type="error"
            message="Erreur de chargement"
            description={error}
            showIcon
          />
        </div>
      )}
      
      {url && (
        <iframe
          src={url}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            display: loading || error ? 'none' : 'block'
          }}
          onLoad={handleLoad}
          onError={handleError}
          title="Document BS"
        />
      )}
    </Modal>
  );
};