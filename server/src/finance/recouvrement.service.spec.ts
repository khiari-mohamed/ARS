import { RecouvrementService } from './recouvrement.service';

describe('RecouvrementService role access', () => {
  let service: RecouvrementService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      ordreVirement: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new RecouvrementService(prisma as any, { } as any);
  });

  it('allows COMPTABILITE to fetch recouvrement data for SAGE workflows', async () => {
    await expect(service.getAllRecouvrementOVs('COMPTABILITE')).resolves.toEqual([]);
  });
});
