import React, { useState } from "react";

interface Props {
  onChange: (filters: any) => void;
  clients?: { id: string; name: string }[];
  contracts?: { id: string; name: string }[];
}

const BordereauFilters: React.FC<Props> = ({ onChange, clients = [], contracts = [] }) => {
  const [reference, setReference] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [statut, setStatut] = useState("");
  const [sla, setSla] = useState("");
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("asc");
  const [search, setSearch] = useState(""); // NEW

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({
      reference,
      clientId,
      contractId,
      statut,
      sla,
      sort,
      order,
      search, // NEW
    });
  };

  return (
    <form className="bordereaux-filters-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Recherche mots-clés..."
        className="filter-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <input
        type="text"
        placeholder="Référence..."
        className="filter-input"
        value={reference}
        onChange={e => setReference(e.target.value)}
      />
      <select className="filter-select" value={clientId} onChange={e => setClientId(e.target.value)}>
        <option value="">Client</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select className="filter-select" value={contractId} onChange={e => setContractId(e.target.value)}>
        <option value="">Contrat</option>
        {contracts.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select className="filter-select" value={statut} onChange={e => setStatut(e.target.value)}>
        <option value="">Statut</option>
        <option value="EN_ATTENTE">En attente</option>
        <option value="SCAN_EN_COURS">Scan en cours</option>
        <option value="SCAN_TERMINE">Scan terminé</option>
        <option value="ASSIGNE">Assigné</option>
        <option value="TRAITE">Traité</option>
        <option value="CLOTURE">Clôturé</option>
        <option value="EN_DIFFICULTE">En difficulté</option>
        <option value="EN_COURS">En cours</option>
        <option value="PARTIEL">Partiel</option>
      </select>
      <select className="filter-select" value={sla} onChange={e => setSla(e.target.value)}>
        <option value="">SLA</option>
        <option value="GREEN">🟢</option>
        <option value="ORANGE">🟠</option>
        <option value="RED">🔴</option>
      </select>
      <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
        <option value="">Trier par</option>
        <option value="dateReception">Date réception</option>
        <option value="nombreBS">Nombre BS</option>
        <option value="delaiReglement">Délai</option>
      </select>
      <select className="filter-select" value={order} onChange={e => setOrder(e.target.value)}>
        <option value="asc">Asc</option>
        <option value="desc">Desc</option>
      </select>
      <button type="submit" className="filter-btn">Filtrer</button>
    </form>
  );
};

export default BordereauFilters;