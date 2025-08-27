import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip
} from '@mui/material';

interface DocumentSelectorProps {
  selectedDocument: any;
  setSelectedDocument: (doc: any) => void;
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({ selectedDocument, setSelectedDocument }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('/api/documents/search', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const docs = await response.json();
          setDocuments(docs.slice(0, 10)); // Limit to 10 recent documents
        } else {
          // Fallback to mock documents
          setDocuments([
            { id: 'doc1', name: 'Contrat Assurance Santé - Client ABC', type: 'CONTRACT' },
            { id: 'doc2', name: 'Bulletin de Soin - Janvier 2024', type: 'BS' },
            { id: 'doc3', name: 'Facture - Prestation Médicale', type: 'FACTURE' }
          ]);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
        setDocuments([]);
      }
    };

    loadDocuments();
  }, []);

  const handleDocumentChange = (docId: string) => {
    setSelectedDocId(docId);
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setSelectedDocument({
        ...selectedDocument,
        selectedDocId: docId,
        selectedDocName: doc.name,
        selectedDocType: doc.type
      });
    }
  };

  return (
    <Box>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Document</InputLabel>
        <Select
          label="Document"
          value={selectedDocId}
          onChange={(e) => handleDocumentChange(e.target.value)}
        >
          {documents.map((doc) => (
            <MenuItem key={doc.id} value={doc.id}>
              <Box display="flex" alignItems="center" gap={1} width="100%">
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {doc.name}
                </Typography>
                <Chip label={doc.type} size="small" variant="outlined" />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {documents.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Aucun document disponible pour le workflow
        </Typography>
      )}
    </Box>
  );
};

export default DocumentSelector;