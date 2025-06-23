import React, { useEffect, useState } from 'react';
import { Document } from '../../types/document';

interface Props {
  document: Document;
}

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
const PDF_EXTENSION = 'pdf';
const TEXT_EXTENSIONS = ['txt', 'log', 'csv', 'md'];

const DocumentViewer: React.FC<Props> = ({ document }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ext = getFileExtension(document.path);

  useEffect(() => {
    if (TEXT_EXTENSIONS.includes(ext)) {
      setLoading(true);
      setTextError(null);
      setTextContent(null);
      // Fetch the text file content
      fetch(`/${document.path}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text file');
          return res.text();
        })
        .then(setTextContent)
        .catch((err) => setTextError(err.message))
        .finally(() => setLoading(false));
    }
  }, [document.path, ext]);

  // Helper to render OCR result if available
  const renderOcrResult = () => {
    const ocrText = document.ocrText || (typeof document.ocrResult === 'string' ? document.ocrResult : '');
    if (ocrText && ocrText.trim()) {
      return (
        <div style={{ marginTop: 24, background: '#f0f7ff', padding: 12, borderRadius: 8 }}>
          <h4>OCR Result</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{ocrText}</pre>
        </div>
      );
    }
    return null;
  };

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return (
      <div style={{ textAlign: 'center' }}>
        <img
          src={`/${document.path}`}
          alt={document.name}
          style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8, boxShadow: '0 2px 8px #0002' }}
          loading="lazy"
        />
        <div>
          <a href={`/${document.path}`} download={document.name}>
            Download Image
          </a>
        </div>
        {renderOcrResult()}
      </div>
    );
  }

  if (ext === PDF_EXTENSION) {
    return (
      <div>
        <iframe
          src={`/${document.path}`}
          title={document.name}
          style={{ width: '100%', height: 600, border: 'none', borderRadius: 8, boxShadow: '0 2px 8px #0002' }}
          allowFullScreen
        />
        <div>
          <a href={`/${document.path}`} download={document.name}>
            Download PDF
          </a>
        </div>
        {renderOcrResult()}
      </div>
    );
  }

  if (TEXT_EXTENSIONS.includes(ext)) {
    return (
      <div style={{ maxHeight: 400, overflowY: 'auto', background: '#f7f7f7', padding: 16, borderRadius: 8 }}>
        <h4>{document.name}</h4>
        {loading && <div>Loading text content...</div>}
        {textError && <div style={{ color: 'red' }}>Error: {textError}</div>}
        {textContent && (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{textContent}</pre>
        )}
        <div>
          <a href={`/${document.path}`} download={document.name}>
            Download Text File
          </a>
        </div>
        {renderOcrResult()}
      </div>
    );
  }

  // Fallback: unknown file type
  return (
    <div>
      <p>
        Preview not available for this file type (<b>{ext}</b>).
      </p>
      <a href={`/${document.path}`} download={document.name}>
        Download {document.name}
      </a>
      {renderOcrResult()}
    </div>
  );
};

export default DocumentViewer;