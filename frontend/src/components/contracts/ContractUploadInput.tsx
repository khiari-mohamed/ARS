import React, { useState } from 'react';

interface Props {
  onFileChange: (file: File | null) => void;
}

const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ContractUploadInput: React.FC<Props> = ({ onFileChange }) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !allowedTypes.includes(file.type)) {
      setError('Only PDF or DOC/DOCX files are allowed.');
      onFileChange(null);
      return;
    }
    setError(null);
    onFileChange(file);
  };

  return (
    <div>
      <label>Upload Document (PDF/DOC):</label>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleChange}
      />
      {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
    </div>
  );
};

export default ContractUploadInput;