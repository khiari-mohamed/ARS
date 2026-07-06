import { SageTxtGenerationService } from './sage-txt-generation.service';

describe('SageTxtGenerationService', () => {
  let service: SageTxtGenerationService;

  beforeEach(() => {
    service = new SageTxtGenerationService({} as any, {} as any);
  });

  describe('extractNumOrdre', () => {
    it('formats virement references as YYYYNNNN', () => {
      expect(service.extractNumOrdre('OV-2026-60001')).toBe('20260001');
      expect(service.extractNumOrdre('OV-2026-60003')).toBe('20260003');
      expect(service.extractNumOrdre('VIR-20260323-0003')).toBe('20260003');
      expect(service.extractNumOrdre('20260003')).toBe('20260003');
    });

    it('uses the fallback Sage date when the reference has no year', () => {
      expect(service.extractNumOrdre('60001', '05072026')).toBe('20260001');
    });
  });

  describe('buildLine', () => {
    it('writes the 8-character virement reference without shifting later fields', () => {
      const line = service.buildLine({
        codeJournal: 'ATT411',
        date: '05072026',
        numOrdre: 'OV-2026-60001',
        compte: '53220900',
        dc: 'C',
        montant: '369,989',
        libelleCompl: 'APAL BR13-2026',
      });

      expect(line).toHaveLength(150);
      expect(line.substring(14, 22)).toBe('20260001');
      expect(line.substring(22, 27)).toBe('     ');
      expect(line.substring(27, 43)).toBe('53220900        ');
      expect(line.substring(43, 78)).toBe('ORDV GM N: 20260001                ');
      expect(line.substring(110, 118)).toBe('20260001');
      expect(line.substring(118, 127)).toBe('         ');
      expect(line.substring(127, 150)).toBe('GM: APAL BR13-202OVMARS');
    });
  });

  describe('normalizeSageTxtTemplate', () => {
    it('expands legacy 5-character order fields and shrinks adjacent padding', () => {
      const normalized = (service as any).normalizeSageTxtTemplate({
        structure: {
          fields: [
            { key: 'numOrdre', start: 14, width: 5 },
            { key: 'padding', start: 19, width: 8 },
            { key: 'compte', start: 27, width: 16 },
            { key: 'numRepeat', start: 110, width: 5 },
            { key: 'padding', start: 115, width: 12 },
            { key: 'libelleCompl', start: 127, width: 23 },
          ],
        },
      });

      expect(normalized.structure.fields).toEqual([
        { key: 'numOrdre', start: 14, width: 8 },
        { key: 'padding', start: 22, width: 5 },
        { key: 'compte', start: 27, width: 16 },
        { key: 'numRepeat', start: 110, width: 8 },
        { key: 'padding', start: 118, width: 9 },
        { key: 'libelleCompl', start: 127, width: 23 },
      ]);
    });
  });
});
