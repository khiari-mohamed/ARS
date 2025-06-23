import { useState } from "react";
import { getReclamationSuggestions } from "../services/bordereauxService";

interface Props {
  complaint: { id: string; [key: string]: any };
}

export default function ComplaintDetails({ complaint }: Props) {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReclamationSuggestions(complaint.id);
      setSuggestion(data);
    } catch (err: any) {
      setError("Erreur lors de la récupération de la suggestion IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complaint-details">
      {/* ...other complaint details... */}
      <button onClick={handleGetSuggestion} className="btn btn-secondary mt-2">
        Voir suggestion IA
      </button>
      {loading && <div className="text-xs text-gray-500 mt-1">Chargement...</div>}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      {suggestion && (
        <div className="mt-2 bg-gray-100 p-2 rounded">
          <b>Suggestion IA:</b> {suggestion.suggestion || JSON.stringify(suggestion)}
        </div>
      )}
    </div>
  );
}
