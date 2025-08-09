import { Document } from "../types/bordereaux";

// Helper to get the full URL for a document
function getDocumentUrl(path: string) {
  // If your backend serves /uploads as static, and path is relative, this will work:
  if (path.startsWith("http")) return path;
  return `${process.env.REACT_APP_API_URL || ""}/${path.replace(/^\\?uploads\\?/, "uploads/")}`;
}

export default function DocumentViewer({ docs }: { docs: Document[] }) {
  if (!docs?.length) return <div>Aucun document lié.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {docs.map(doc => {
        const url = getDocumentUrl(doc.path);
        return (
          <div key={doc.id} className="border rounded p-2">
            <div className="font-semibold"><span>{doc.name}</span></div>
            {doc.type === "pdf" ? (
              <iframe src={url} className="w-full h-48" />
            ) : (
              <img src={url} alt="Document" className="max-h-48" />
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="text-blue-600 underline text-xs"
            >
              Télécharger
            </a>
          </div>
        );
      })}
    </div>
  );
}