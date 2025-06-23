import { useState } from "react";
import { createCourrier, sendCourrier, searchCourriers } from "../services/gecService";

export default function CourrierPanel() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [courriers, setCourriers] = useState<any[]>([]);

  const handleCreate = async () => {
    await createCourrier({ subject, body });
    alert("Courrier créé !");
  };

  const handleSend = async (id: string) => {
    await sendCourrier(id, { recipientEmail });
    alert("Courrier envoyé !");
  };

  const handleSearch = async () => {
    const results = await searchCourriers();
    setCourriers(results);
  };

  return (
    <div className="courrier-panel">
      <h3>Courriers</h3>
      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Sujet" />
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Corps" />
      <button onClick={handleCreate}>Créer Courrier</button>
      <button onClick={handleSearch}>Voir Courriers</button>
      <ul>
        {courriers.map(c => (
          <li key={c.id}>
            {c.subject} - {c.status}
            <button onClick={() => handleSend(c.id)}>Envoyer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}