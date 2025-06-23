import React, { useEffect, useState } from 'react';
import { searchDocuments, getSlaStatus } from '../../api/gedService';
import { Document } from '../../types/document';
import SlaBreachTable from './SlaBreachTable';

const GEDDashboard: React.FC = () => {
  const [pendingScan, setPendingScan] = useState<number>(0);
  const [scanned, setScanned] = useState<number>(0);
  const [processed, setProcessed] = useState<number>(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [slaCounts, setSlaCounts] = useState({ green: 0, orange: 0, red: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    searchDocuments({})
      .then((docs) => {
        setDocuments(docs);
        setPendingScan(docs.filter((d) => d.type === 'BS' && !d.ocrResult).length);
        setScanned(docs.filter((d) => d.ocrResult).length);
        setProcessed(docs.filter((d) => d.type === 'BS' && d.ocrResult && d.bordereau?.statut === 'TRAITE').length);
      })
      .finally(() => setLoading(false));
    getSlaStatus().then((docs) => {
      const counts = { green: 0, orange: 0, red: 0 };
      docs.forEach((d) => {
        if (d.slaStatus === 'red') counts.red++;
        else if (d.slaStatus === 'orange') counts.orange++;
        else counts.green++;
      });
      setSlaCounts(counts);
    });
  }, []);

  return (
    <div>
      <h2>GED Dashboard</h2>
      <div className="ged-kpis">
        <div>
          <strong>Pending Scan:</strong> {pendingScan}
        </div>
        <div>
          <strong>Scanned:</strong> {scanned}
        </div>
        <div>
          <strong>Processed:</strong> {processed}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <strong>SLA Status:</strong>
        <span style={{ marginLeft: 8 }}>🟢 {slaCounts.green}</span>
        <span style={{ marginLeft: 8 }}>🟠 {slaCounts.orange}</span>
        <span style={{ marginLeft: 8 }}>🔴 {slaCounts.red}</span>
      </div>
      <div>
        <h3>Recent Documents</h3>
        {loading ? <div>Loading...</div> : (
          <ul>
            {documents.slice(0, 5).map((doc) => (
              <li key={doc.id}>{doc.name} ({doc.type})</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ marginTop: 32 }}>
        <SlaBreachTable />
      </div>
    </div>
  );
};

export default GEDDashboard;