import { useState, useEffect, useCallback } from 'react';
import { Virement, VirementSearchParams } from '../types/finance';
import { fetchVirements } from '../api/financeService';

export function useFinance(initialFilters: VirementSearchParams = {}) {
  const [virements, setVirements] = useState<Virement[]>([]);
  const [filters, setFilters] = useState<VirementSearchParams>(initialFilters);
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVirements = useCallback(() => {
    setLoading(true);
    fetchVirements({ ...filters, page, size })
      .then(setVirements)
      .catch((err) => setError(err.message || 'Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [filters, page, size]);

  useEffect(() => {
    loadVirements();
  }, [loadVirements]);

  return {
    virements,
    filters,
    setFilters,
    page,
    setPage,
    size,
    setSize,
    loading,
    error,
    reload: loadVirements,
  };
}