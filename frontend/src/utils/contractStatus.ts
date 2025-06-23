export type ContractStatus = 'future' | 'active' | 'expired';

export function getContractStatus(startDate: string, endDate: string): ContractStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > now) return 'future';
  if (end < now) return 'expired';
  return 'active';
}