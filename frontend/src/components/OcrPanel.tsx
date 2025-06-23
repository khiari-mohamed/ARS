import { useState } from "react";
import { processOcr, getOcrResult, patchOcrResult } from "../services/ocrService";

export default function OcrPanel({ documentId }: { documentId: string }) {
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [correction, setCorrection] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProcessOcr = async () => {
    if (!file) return;
    setLoading(true);
    const result = await processOcr(file, documentId);
    setOcrResult(result);
    setLoading(false);
  };

  const handleGetOcrResult = async () => {
    setLoading(true);
    const result = await getOcrResult(documentId);
    setOcrResult(result);
    setLoading(false);
  };

  const handlePatchOcr = async () => {
    setLoading(true);
    const result = await patchOcrResult(documentId, { correction });
    setOcrResult(result);
    setLoading(false);
  };

  return (
    <div className="ocr-panel">
      <h3>OCR</h3>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleProcessOcr} disabled={!file || loading}>Lancer OCR</button>
      <button onClick={handleGetOcrResult} disabled={loading}>Voir Résultat OCR</button>
      {ocrResult && (
        <div>
          <pre>{JSON.stringify(ocrResult, null, 2)}</pre>
          <input
            type="text"
            placeholder="Correction"
            value={correction}
            onChange={e => setCorrection(e.target.value)}
          />
          <button onClick={handlePatchOcr} disabled={loading}>Corriger OCR</button>
        </div>
      )}
    </div>
  );
}