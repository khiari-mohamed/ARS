export class OcrResponseDto {
  rawText: string;
  extracted: {
    reference?: string;
    client?: string;
    date?: string;
    montant?: number;
    [key: string]: any;
  };
  corrected?: {
    reference?: string;
    client?: string;
    date?: string;
    montant?: number;
    [key: string]: any;
  };
  ocrAt: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}
