import React, { useState } from "react";

interface Props {
  onChange: (filters: any) => void;
  clients?: { id: string; name: string }[];
  contracts?: { id: string; name: string }[];
  teams?: { id: string; name: string }[];
  types?: { value: string; label: string }[];
  performances?: { value: string; label: string }[];
}

const statusOptions = [
  { value: '', label: 'Statut' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'SCAN_EN_COURS', label: 'Scan en cours' },
  { value: 'SCAN_TERMINE', label: 'Scan terminé' },
  { value: 'ASSIGNE', label: 'Assigné' },
  { value: 'TRAITE', label: 'Traité' },
  { value: 'CLOTURE', label: 'Clôturé' },
  { value: 'EN_DIFFICULTE', label: 'En difficulté' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'PARTIEL', label: 'Partiel' },
];

const slaOptions = [
  { value: '', label: 'SLA' },
  { value: 'GREEN', label: '🟢' },
  { value: 'ORANGE', label: '🟠' },
  { value: 'RED', label: '🔴' },
];

const typeOptions = [
  { value: '', label: 'Type' },
  { value: 'BS', label: 'BS' },
  { value: 'CONTRAT', label: 'Contrat' },
  { value: 'AUTRE', label: 'Autre' },
];

const performanceOptions = [
  { value: '', label: 'Performance' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'LOW', label: 'Basse' },
];

const BordereauFilters: React.FC<Props> = ({ onChange, clients = [], contracts = [], teams = [], types = typeOptions, performances = performanceOptions }) => {
  const [reference, setReference] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [statut, setStatut] = useState("");
  const [sla, setSla] = useState("");
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("asc");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [teamId, setTeamId] = useState("");
  const [performance, setPerformance] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

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
      search,
      type,
      teamId,
      performance,
      dateStart,
      dateEnd,
    });
  };

  return (
    <form className="bordereaux-filters-form flex flex-wrap gap-2 items-end mb-4" onSubmit={handleSubmit}>
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
        {statusOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select className="filter-select" value={sla} onChange={e => setSla(e.target.value)}>
        {slaOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select className="filter-select" value={type} onChange={e => setType(e.target.value)}>
        {types.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select className="filter-select" value={teamId} onChange={e => setTeamId(e.target.value)}>
        <option value="">Équipe</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select className="filter-select" value={performance} onChange={e => setPerformance(e.target.value)}>
        {performances.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <input
        type="date"
        className="filter-input"
        value={dateStart}
        onChange={e => setDateStart(e.target.value)}
        placeholder="Date début"
      />
      <input
        type="date"
        className="filter-input"
        value={dateEnd}
        onChange={e => setDateEnd(e.target.value)}
        placeholder="Date fin"
      />
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
