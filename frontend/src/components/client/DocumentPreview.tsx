import React, { useState } from 'react';
import { Modal, Button, Upload, message, Card, Typography } from 'antd';
import { EyeOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';

interface Props {
  documentId: string;
  documentName: string;
}

const DocumentPreview: React.FC<Props> = ({ documentId, documentName }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const showPreview = async () => {
    try {
      const response = await fetch(`/api/clients/documents/${documentId}/preview`);
      const data = await response.json();
      setPreviewData(data);
      setPreviewVisible(true);
    } catch (error) {
      message.error('Failed to load document preview');
    }
  };

  const downloadDocument = () => {
    window.open(`/api/clients/documents/${documentId}/download`, '_blank');
  };

  const uploadNewVersion = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await fetch(`/api/clients/documents/${documentId}/version`, {
        method: 'POST',
        body: formData
      });
      message.success('New version uploaded');
    } catch (error) {
      message.error('Failed to upload new version');
    }
  };

  return (
    <>
      <Button icon={<EyeOutlined />} onClick={showPreview} size="small">
        Preview
      </Button>
      <Button icon={<DownloadOutlined />} onClick={downloadDocument} size="small">
        Download
      </Button>
      <Upload
        beforeUpload={(file) => {
          uploadNewVersion(file);
          return false;
        }}
        showUploadList={false}
      >
        <Button icon={<UploadOutlined />} size="small">
          New Version
        </Button>
      </Upload>

      <Modal
        title={`Preview: ${documentName}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        {previewData && (
          <Card>
            <Typography.Text>Size: {(previewData.size / 1024).toFixed(2)} KB</Typography.Text>
            <br />
            <Typography.Text>Type: {previewData.extension}</Typography.Text>
            <br />
            <Typography.Text>Uploaded: {new Date(previewData.uploadedAt).toLocaleDateString()}</Typography.Text>
            {previewData.canPreview && previewData.extension === '.pdf' && (
              <iframe
                src={`/api/clients/documents/${documentId}/view`}
                width="100%"
                height="500px"
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}
      </Modal>
    </>
  );
};

export default DocumentPreview;