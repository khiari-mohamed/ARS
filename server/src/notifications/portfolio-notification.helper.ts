import { PrismaService } from '../prisma/prisma.service';

const OV_STATUS_LABELS: Record<string, string> = {
  VIREMENT_DEPOSE: 'Déposé',
  VIREMENT_NON_VALIDE: 'Non valide',
  VIREMENT_AUTORISE: 'Autorisé',
  BLOQUE: 'Bloqué',
  EXECUTE: 'Exécuté',
  REJETE: 'Rejeté',
};

const TRACKED_OV_STATUSES = new Set(Object.keys(OV_STATUS_LABELS));

export async function notifySeniorPortfolioForOVStatus(
  prisma: PrismaService,
  ov: {
    id: string;
    reference: string;
    clientId?: string | null;
    bordereauId?: string | null;
    bordereau?: { clientId?: string | null } | null;
  },
  status: string,
  comment?: string,
): Promise<void> {
  if (!TRACKED_OV_STATUSES.has(status)) return;

  const clientId = ov.clientId || ov.bordereau?.clientId;
  const portfolioRelations: any[] = [];

  if (clientId) {
    portfolioRelations.push({ clientsManaged: { some: { id: clientId } } });
  }

  if (ov.bordereauId) {
    portfolioRelations.push({
      contractsAsTeamLeader: {
        some: { bordereaux: { some: { id: ov.bordereauId } } },
      },
    });
  }

  if (portfolioRelations.length === 0) return;

  try {
    const seniors = await prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE_SENIOR',
        active: true,
        OR: portfolioRelations,
      },
      select: { id: true },
    });

    if (seniors.length === 0) return;

    const label = OV_STATUS_LABELS[status];
    await prisma.notification.createMany({
      data: seniors.map((senior) => ({
        userId: senior.id,
        type: 'VIREMENT_UPDATE',
        title: `Changement de statut OV - ${label}`,
        message: `L'OV ${ov.reference} est maintenant ${label}.${comment ? ` ${comment}` : ''}`,
        data: {
          ordreVirementId: ov.id,
          bordereauId: ov.bordereauId || undefined,
          clientId: clientId || undefined,
          reference: ov.reference,
          status,
          statusLabel: label,
          comment,
        },
        read: false,
      })),
    });
  } catch (error) {
    console.error('Failed to notify senior portfolio for OV status:', error);
  }
}
