import React from "react";
import { SearchResult } from "../types/bordereaux";
import BordereauCard from "./BordereauCard";

interface Props {
  results: SearchResult[];
}

const SearchResultsPanel: React.FC<Props> = ({ results }) => (
  <div className="bordereaux-search-results">
    <h2>Résultats de recherche</h2>
    {results.length === 0 ? (
      <div>Aucun résultat trouvé.</div>
    ) : (
      results.map((result: SearchResult) =>
        "reference" in result ? (
          <BordereauCard key={result.id} bordereau={result} />
        ) : (
          <div key={result.id} className="border rounded p-2 my-2">
            <div className="font-semibold">Document: {result.name}</div>
            <div>Type: {result.type}</div>
            <div>Chemin: {result.path}</div>
            {result.ocrResult?.text && (
              <div className="text-xs text-gray-500 mt-1">OCR: {result.ocrResult.text}</div>
            )}
          </div>
        )
      )
    )}
  </div>
);

export default SearchResultsPanel;