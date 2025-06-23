import React from 'react';

interface ModalViewerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'image';
}

export const ModalViewer: React.FC<ModalViewerProps> = ({
  open,
  onClose,
  title,
  fileUrl,
  fileType = 'pdf',
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg max-w-3xl w-full p-4 relative">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-black"
          onClick={onClose}
          aria-label="Fermer"
        >
          ✕
        </button>
        {title && <h3 className="mb-2 font-bold">{title}</h3>}
        <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
          {fileType === 'pdf' && fileUrl && (
            <iframe
              src={fileUrl}
              title="Document PDF"
              width="100%"
              height="500px"
              style={{ border: 'none' }}
            />
          )}
          {fileType === 'image' && fileUrl && (
            <img src={fileUrl} alt="Document" className="max-w-full max-h-[60vh] mx-auto" />
          )}
          {!fileUrl && <div className="text-gray-500">Aucun document à afficher.</div>}
        </div>
      </div>
    </div>
  );
};