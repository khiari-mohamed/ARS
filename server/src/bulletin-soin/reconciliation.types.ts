export interface ExternalPayment {
  reference: string;
  amount: number;
  date?: string;
  matched?: boolean;
}

export interface ReconciliationReport {
  matched: { virement: any; external: ExternalPayment }[];
  unmatched: any[];
  externalUnmatched: ExternalPayment[];
}
