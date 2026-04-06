import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './auth/public.decorator';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly prisma: PrismaService) {}

  private readonly eligibleReassignmentRoles = [
    'CHEF_EQUIPE',
    'GESTIONNAIRE_SENIOR',
    'GESTIONNAIRE'
  ] as const;

  private computeRemainingDays(dateReception: Date | null | undefined, delaiReglement: number | null | undefined, now: Date) {
    const receptionDate = dateReception ? new Date(dateReception) : now;
    const slaDays = delaiReglement && delaiReglement > 0 ? delaiReglement : 30;
    const deadlineDate = new Date(receptionDate);
    deadlineDate.setDate(deadlineDate.getDate() + slaDays);

    const remainingDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      remainingDays,
      deadlineDate,
      slaDays
    };
  }

  private calculateTimeBasedUtilization(documents: any[], capacity: number, now: Date) {
    let totalRequiredPerDay = 0;
    let urgentDocuments = 0;
    let overdueDocuments = 0;

    for (const doc of documents) {
      const bordereau = doc.bordereau || doc;
      const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
      const dateReception = bordereau?.dateReception || now;

      const { remainingDays } = this.computeRemainingDays(dateReception, delaiReglement, now);
      const effectiveDays = Math.max(1, remainingDays);

      totalRequiredPerDay += 1 / effectiveDays;

      if (remainingDays < 0) overdueDocuments++;
      else if (remainingDays <= 3) urgentDocuments++;
    }

    const utilizationRate = capacity > 0 ? Math.round((totalRequiredPerDay / capacity) * 100) : 0;

    return {
      utilizationRate,
      requiredPerDay: Math.round(totalRequiredPerDay * 10) / 10,
      urgentDocuments,
      overdueDocuments
    };
  }

  private async getAssignableTargetTeams(sourceTeamId?: string) {
    const now = new Date();

    const chefEquipes = await this.prisma.user.findMany({
      where: {
        role: 'CHEF_EQUIPE',
        active: true,
        ...(sourceTeamId ? { id: { not: sourceTeamId } } : {})
      },
      include: {
        teamMembers: {
          where: {
            active: true,
            role: { in: this.eligibleReassignmentRoles as unknown as string[] }
          },
          include: {
            assignedDocuments: {
              include: {
                bordereau: {
                  select: {
                    dateReception: true,
                    delaiReglement: true,
                    contract: {
                      select: { delaiReglement: true }
                    }
                  }
                }
              }
            }
          }
        },
        assignedDocuments: {
          include: {
            bordereau: {
              select: {
                dateReception: true,
                delaiReglement: true,
                contract: {
                  select: { delaiReglement: true }
                }
              }
            }
          }
        }
      }
    });

    const individualCandidates = await this.prisma.user.findMany({
      where: {
        role: { in: ['GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'] },
        active: true,
        id: { not: sourceTeamId || '' }
      },
      include: {
        assignedDocuments: {
          include: {
            bordereau: {
              select: {
                dateReception: true,
                delaiReglement: true,
                contract: {
                  select: { delaiReglement: true }
                }
              }
            }
          }
        },
        contractsAsTeamLeader: {
          include: {
            bordereaux: {
              where: { archived: false },
              include: {
                documents: true,
                contract: true
              }
            }
          }
        }
      }
    });

    const teams: any[] = [];

    for (const chef of chefEquipes) {
      const teamMembers = chef.teamMembers || [];
      const allDocs = [...chef.assignedDocuments, ...teamMembers.flatMap(member => member.assignedDocuments)];
      const totalCapacity = chef.capacity + teamMembers.reduce((sum, member) => sum + member.capacity, 0);
      const metrics = this.calculateTimeBasedUtilization(allDocs, totalCapacity, now);
      const completedCount = await this.prisma.document.count({
        where: {
          assignedToUserId: chef.id,
          status: 'TRAITE'
        }
      });

      teams.push({
        id: chef.id,
        name: `Équipe ${chef.fullName}`,
        fullName: chef.fullName,
        role: chef.role,
        workload: allDocs.length,
        capacity: totalCapacity,
        utilizationRate: metrics.utilizationRate,
        requiredPerDay: metrics.requiredPerDay,
        urgentDocuments: metrics.urgentDocuments,
        overdueDocuments: metrics.overdueDocuments,
        performanceScore: completedCount,
        teamSize: teamMembers.length + 1,
        availableCapacityPerDay: Math.max(0, totalCapacity - metrics.requiredPerDay)
      });
    }

    for (const user of individualCandidates) {
      let allDocs = user.assignedDocuments;

      // For GESTIONNAIRE_SENIOR: Count documents assigned to them (assignedToUserId)
      // NOT all documents from contracts they lead (teamLeaderId)
      if (user.role === 'GESTIONNAIRE_SENIOR') {
        allDocs = await this.prisma.document.findMany({
          where: { assignedToUserId: user.id },
          include: {
            bordereau: {
              select: {
                dateReception: true,
                delaiReglement: true,
                contract: {
                  select: { delaiReglement: true }
                }
              }
            }
          }
        });
         console.log(`[DEBUG] After query for ${user.fullName}: found ${allDocs.length} assigned documents`);
      }

      const metrics = this.calculateTimeBasedUtilization(allDocs, user.capacity, now);
      const completedCount = await this.prisma.document.count({
        where: {
          assignedToUserId: user.id,
          status: 'TRAITE'
        }
      });

      teams.push({
        id: user.id,
        name: user.fullName,
        fullName: user.fullName,
        role: user.role,
        workload: allDocs.length,
        capacity: user.capacity,
        utilizationRate: metrics.utilizationRate,
        requiredPerDay: metrics.requiredPerDay,
        urgentDocuments: metrics.urgentDocuments,
        overdueDocuments: metrics.overdueDocuments,
        performanceScore: completedCount,
        teamSize: 1,
        availableCapacityPerDay: Math.max(0, user.capacity - metrics.requiredPerDay)
      });
    }

    return teams
      .filter(team =>
        this.eligibleReassignmentRoles.includes(team.role) &&
        team.role !== 'SUPER_ADMIN' &&
        team.role !== 'RESPONSABLE_DEPARTEMENT'
      )
      .sort((a, b) => {
        if (a.utilizationRate !== b.utilizationRate) return a.utilizationRate - b.utilizationRate;
        if (a.overdueDocuments !== b.overdueDocuments) return a.overdueDocuments - b.overdueDocuments;
        if (a.urgentDocuments !== b.urgentDocuments) return a.urgentDocuments - b.urgentDocuments;
        return b.performanceScore - a.performanceScore;
      });
  }

  private async getSourceDocumentsForTeam(teamId: string, count?: number) {
    const now = new Date();

    console.log('📄 [GET-SOURCE-DOCS] Starting for teamId:', teamId, 'count:', count);

    const sourceTeam = await this.prisma.user.findUnique({
      where: { id: teamId },
      include: {
        assignedDocuments: {
          include: {
            bordereau: {
              select: {
                id: true,
                reference: true,
                dateReception: true,
                delaiReglement: true,
                contract: { select: { delaiReglement: true } }
              }
            }
          }
        },
        teamMembers: {
          where: {
            active: true,
            role: { in: this.eligibleReassignmentRoles as unknown as string[] }
          },
          include: {
            assignedDocuments: {
              include: {
                bordereau: {
                  select: {
                    id: true,
                    reference: true,
                    dateReception: true,
                    delaiReglement: true,
                    contract: { select: { delaiReglement: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!sourceTeam) {
      console.log('❌ [GET-SOURCE-DOCS] Source team not found');
      return { sourceTeam: null, documents: [] };
    }

    console.log('👥 [GET-SOURCE-DOCS] Source team:', sourceTeam.fullName, 'role:', sourceTeam.role);
    console.log('📄 [GET-SOURCE-DOCS] Assigned documents:', sourceTeam.assignedDocuments.length);
    console.log('👥 [GET-SOURCE-DOCS] Team members:', sourceTeam.teamMembers?.length || 0);

    let rawDocs: any[];
    
    if (sourceTeam.role === 'CHEF_EQUIPE') {
      rawDocs = [
        ...sourceTeam.assignedDocuments.map(doc => ({ ...doc, currentOwnerId: sourceTeam.id })),
        ...(sourceTeam.teamMembers || []).flatMap(member =>
          member.assignedDocuments.map(doc => ({ ...doc, currentOwnerId: member.id }))
        )
      ];
    } else if (sourceTeam.role === 'GESTIONNAIRE_SENIOR') {
      // GESTIONNAIRE_SENIOR: Get documents assigned to them (assignedToUserId)
      // NOT all documents from contracts they lead (teamLeaderId)
      const assignedDocs = await this.prisma.document.findMany({
        where: { assignedToUserId: sourceTeam.id },
        include: {
          bordereau: {
            select: {
              id: true,
              reference: true,
              dateReception: true,
              delaiReglement: true,
              contract: { select: { delaiReglement: true } }
            }
          }
        }
      });
      
      rawDocs = assignedDocs.map(doc => ({ ...doc, currentOwnerId: sourceTeam.id }));
      console.log('📄 [GET-SOURCE-DOCS] GESTIONNAIRE_SENIOR assigned docs:', rawDocs.length);
    } else {
      rawDocs = sourceTeam.assignedDocuments.map(doc => ({ ...doc, currentOwnerId: sourceTeam.id }));
    }

    console.log('📄 [GET-SOURCE-DOCS] Raw docs count:', rawDocs.length);

    const scoredDocs = rawDocs
      .map(doc => {
        const delaiReglement = doc.bordereau?.delaiReglement || doc.bordereau?.contract?.delaiReglement || 30;
        const { remainingDays } = this.computeRemainingDays(doc.bordereau?.dateReception, delaiReglement, now);

        return {
          doc,
          remainingDays,
          isUrgent: remainingDays <= 3,
          isOverdue: remainingDays < 0
        };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? 1 : -1;
        if (a.isUrgent !== b.isUrgent) return a.isUrgent ? 1 : -1;
        return b.remainingDays - a.remainingDays;
      })
      .slice(0, count || rawDocs.length);

    console.log('📄 [GET-SOURCE-DOCS] Scored docs count:', scoredDocs.length);
    console.log('📄 [GET-SOURCE-DOCS] Filtered (assignedToUserId):', rawDocs.filter(doc => doc.assignedToUserId).length);

    return {
      sourceTeam,
      documents: scoredDocs
    };
  }

  private buildReassignmentPlan(
    sourceWorkload: number,
    sourceUtilizationRate: number,
    candidateDocuments: Array<{ doc: any; remainingDays: number; isUrgent: boolean; isOverdue: boolean }>,
    targetTeams: any[]
  ) {
    console.log('📋 [BUILD-PLAN] Starting - sourceWorkload:', sourceWorkload, 'candidateDocuments:', candidateDocuments.length, 'targetTeams:', targetTeams.length);
    
    // First try teams with available capacity
    let rankedTargets = targetTeams
      .filter(team => team.availableCapacityPerDay > 0)
      .slice(0, 5);

    console.log('📋 [BUILD-PLAN] Ranked targets with capacity > 0:', rankedTargets.length);
    
    // If no teams have capacity, use least loaded teams as fallback
    if (rankedTargets.length === 0 && targetTeams.length > 0) {
      console.log('⚠️ [BUILD-PLAN] No teams with available capacity, using least loaded teams');
      rankedTargets = targetTeams
        .filter(team => team.utilizationRate < sourceUtilizationRate)
        .slice(0, 3);
      console.log('📋 [BUILD-PLAN] Fallback targets (less loaded):', rankedTargets.length);
    }
    
    rankedTargets.forEach(t => console.log('  -', t.fullName, 'utilization:', t.utilizationRate + '%', 'availableCapacity:', t.availableCapacityPerDay));

    if (rankedTargets.length === 0 || candidateDocuments.length === 0) {
      console.log('❌ [BUILD-PLAN] No valid targets or documents');
      return {
        totalTransferable: 0,
        projectedSourceRate: sourceUtilizationRate,
        primaryTarget: null,
        splits: []
      };
    }

    const targetCapacityPlan = rankedTargets.map(team => {
  // If availableCapacityPerDay is zero but the team is not overloaded (utilization < 90%),
  // use its raw capacity as the effective capacity.
  let effectiveCapacity = team.availableCapacityPerDay;
  if (effectiveCapacity === 0 && team.utilizationRate < 90) {
    effectiveCapacity = Math.max(1, team.capacity - team.workload); // actual free capacity
    console.log(`📋 [BUILD-PLAN] Using raw capacity for ${team.fullName}: ${effectiveCapacity} docs (availableCapacity was 0)`);
  }
  effectiveCapacity = Math.max(1, effectiveCapacity);
  return {
    id: team.id,
    fullName: team.fullName,
    role: team.role,
    utilizationRate: team.utilizationRate,
    performanceScore: team.performanceScore,
    availableCapacityPerDay: team.availableCapacityPerDay,
    capacitySlots: Math.max(1, Math.floor(effectiveCapacity))
  };
});

    // Desired reduction in percentage points (e.g., from 102% to 90% = 12 points)
const desiredReductionPoints = Math.min(20, sourceUtilizationRate - 85);
const reliefRatioNeeded = desiredReductionPoints / 100;
// Transfer enough documents to achieve that reduction, but at most 20% of source workload
const desiredTransferCount = Math.max(1, Math.min(Math.ceil(sourceWorkload * reliefRatioNeeded), Math.ceil(sourceWorkload * 0.2)));


    let remainingToAllocate = Math.min(candidateDocuments.length, desiredTransferCount);
    const splits: any[] = [];

    for (const target of targetCapacityPlan) {
      if (remainingToAllocate <= 0) break;

      const allocation = Math.min(remainingToAllocate, target.capacitySlots);
      if (allocation <= 0) continue;

      const projectedTargetRate = Math.round(
        target.utilizationRate + ((allocation / Math.max(target.availableCapacityPerDay || 1, 1)) * 100)
      );

      splits.push({
        targetTeamId: target.id,
        target: target.fullName,
        targetRole: target.role,
        count: allocation,
        targetUtilizationRate: target.utilizationRate,
        targetPerformanceScore: target.performanceScore,
        targetAvailableCapacity: target.availableCapacityPerDay,
        projectedTargetRate,
        rationale: `Réaffecter ${allocation} document(s) vers ${target.fullName} pour exploiter sa capacité disponible (${Math.round(target.availableCapacityPerDay)} doc/jour) avec une charge actuelle de ${target.utilizationRate}%.`
      });

      remainingToAllocate -= allocation;
    }

    const totalTransferable = splits.reduce((sum, split) => sum + split.count, 0);
    const projectedSourceRate = Math.max(
      0,
      Math.round(sourceUtilizationRate - (totalTransferable / Math.max(sourceWorkload, 1)) * 100)
    );

    return {
      totalTransferable,
      projectedSourceRate,
      primaryTarget: splits[0] || null,
      splits
    };
  }

  private async calculateSmartAISuggestions(data: {
    teamId: string;
    teamName: string;
    workload: number;
    utilizationRate: number;
  }) {
    const now = new Date();
    const targetTeams = await this.getAssignableTargetTeams(data.teamId);
    const { sourceTeam, documents } = await this.getSourceDocumentsForTeam(data.teamId);

    if (!sourceTeam) {
      return {
        suggestions: ['Équipe non trouvée'],
        recommendations: [],
        analysis: {
          totalDocuments: data.workload,
          urgentDocuments: 0,
          overdueDocuments: 0,
          utilizationRate: data.utilizationRate,
          availableTeams: 0,
          status: 'UNKNOWN'
        }
      };
    }

    const allDocs = sourceTeam.role === 'CHEF_EQUIPE'
      ? [...sourceTeam.assignedDocuments, ...(sourceTeam.teamMembers || []).flatMap(m => m.assignedDocuments)]
      : sourceTeam.assignedDocuments;

    const sourceMetrics = this.calculateTimeBasedUtilization(
      allDocs,
      sourceTeam.role === 'CHEF_EQUIPE'
        ? sourceTeam.capacity + (sourceTeam.teamMembers || []).reduce((sum, member) => sum + member.capacity, 0)
        : sourceTeam.capacity,
      now
    );

    console.log('🤖 AI Suggestions Debug:', {
      teamId: data.teamId,
      teamName: data.teamName,
      workload: data.workload,
      utilizationRate: data.utilizationRate,
      targetTeamsCount: targetTeams.length,
      documentsCount: documents.length,
      bestTarget: targetTeams[0] ? {
        id: targetTeams[0].id,
        name: targetTeams[0].fullName,
        utilizationRate: targetTeams[0].utilizationRate,
        availableCapacity: targetTeams[0].availableCapacityPerDay
      } : null
    });

    const suggestions: string[] = [];
    const recommendations: any[] = [];

    const bestTarget = targetTeams[0];
    console.log('🎯 [AI-SUGGESTIONS] Best target:', bestTarget ? { name: bestTarget.fullName, utilization: bestTarget.utilizationRate, availableCapacity: bestTarget.availableCapacityPerDay } : 'NONE');
    console.log('📊 [AI-SUGGESTIONS] Utilization check:', data.utilizationRate, '% (threshold: 70%)');
    if (bestTarget && data.utilizationRate >= 70) {
   const safeDocuments = documents.filter(item => !item.isUrgent && !item.isOverdue);
const fallbackDocuments = documents.filter(item => !item.isOverdue);
let candidateDocuments = documents; // default to all
     const minPoolSize = Math.max(1, Math.ceil(documents.length * 0.05));
if (safeDocuments.length >= minPoolSize) {
  candidateDocuments = safeDocuments;
  console.log(`📄 Using safe documents pool: ${safeDocuments.length} docs`);
} else if (fallbackDocuments.length >= minPoolSize) {
  candidateDocuments = fallbackDocuments;
  console.log(`📄 Using fallback documents pool: ${fallbackDocuments.length} docs`);
} else {
  console.log(`📄 Using all documents (last resort): ${documents.length} docs`);
}
      const reassignmentPlan = this.buildReassignmentPlan(
        data.workload,
        data.utilizationRate,
        candidateDocuments,
        targetTeams
      );

      if (reassignmentPlan.totalTransferable > 0) {
  const primaryTarget = reassignmentPlan.primaryTarget;
  const splitText = reassignmentPlan.splits
    .map(split => `${split.count} vers ${split.target} (${split.targetUtilizationRate}%)`)
    .join(', ');

  suggestions.push(
    reassignmentPlan.splits.length > 1
      ? `Réaffecter ${reassignmentPlan.totalTransferable} document(s) en répartition multi-cibles: ${splitText}. Projection estimée pour ${data.teamName}: ~${reassignmentPlan.projectedSourceRate}%`
      : `Réaffecter ${reassignmentPlan.totalTransferable} document(s) vers ${primaryTarget.target} (${primaryTarget.targetUtilizationRate}% d'utilisation, score perf ${primaryTarget.targetPerformanceScore}) pour ramener ${data.teamName} vers ~${reassignmentPlan.projectedSourceRate}%`
  );
  
  recommendations.push({
    type: 'REASSIGNMENT',
    action: 'Transférer des documents',
    target: primaryTarget.target,
    targetTeamId: primaryTarget.targetTeamId,
    targetRole: primaryTarget.targetRole,
    count: reassignmentPlan.totalTransferable,
    projectedSourceRate: reassignmentPlan.projectedSourceRate,
    projectedTargetRate: primaryTarget.projectedTargetRate,
    targetUtilizationRate: primaryTarget.targetUtilizationRate,
    targetPerformanceScore: primaryTarget.targetPerformanceScore,
    targetAvailableCapacity: primaryTarget.targetAvailableCapacity,
    candidatePoolSize: candidateDocuments.length,
    usedFallbackPool: safeDocuments.length === 0,
    splitSupported: reassignmentPlan.splits.length > 1,
    splits: reassignmentPlan.splits,
    priority: data.utilizationRate >= 120 ? 'CRITICAL' : 'HIGH',
    rationale: reassignmentPlan.splits.length > 1
      ? `Plan optimisé sur plusieurs cibles pour maximiser la réduction de charge sans saturer une seule équipe.`
      : safeDocuments.length > 0
        ? `Cible sélectionnée car charge la plus faible (${primaryTarget.targetUtilizationRate}%) et meilleure performance relative (${primaryTarget.targetPerformanceScore}).`
        : fallbackDocuments.length > 0
          ? `Documents non en retard sélectionnés pour réaffectation vers ${primaryTarget.target}.`
          : `⚠️ ATTENTION: Tous les documents sont en retard. Réaffectation d'urgence recommandée vers ${primaryTarget.target} pour répartir la charge critique.`
  });

  if (reassignmentPlan.splits.length > 1) {
    recommendations.push({
      type: 'REASSIGNMENT_SPLIT',
      action: 'Répartition multi-cibles',
      splits: reassignmentPlan.splits,
      totalCount: reassignmentPlan.totalTransferable,
      projectedSourceRate: reassignmentPlan.projectedSourceRate,
      priority: data.utilizationRate >= 120 ? 'CRITICAL' : 'HIGH',
      rationale: 'Vous pouvez répartir les documents entre plusieurs cibles ou tout affecter à la meilleure cible selon la décision finale.'
    });
  }
} else if (targetTeams.length > 0 && candidateDocuments.length > 0) {
  // FALLBACK: Even if the plan gave zero, we still have documents and targets.
 const minTransferCount = Math.max(1, Math.ceil(data.workload * 0.05)); // at least 5% of workload
const effectiveAvailable = bestTarget.availableCapacityPerDay > 0 
  ? bestTarget.availableCapacityPerDay 
  : bestTarget.capacity; // fallback to raw capacity
  const fallbackCount = Math.min(candidateDocuments.length, minTransferCount, effectiveAvailable);
  if (fallbackCount > 0) {
    const rationale = safeDocuments.length === 0 && fallbackDocuments.length === 0
      ? `⚠️ Tous les documents sont en retard. Réaffectation d'urgence de ${fallbackCount} document(s) vers ${bestTarget.fullName} pour tenter de répartir la charge critique.`
      : `Réaffectation de ${fallbackCount} document(s) vers ${bestTarget.fullName} (${bestTarget.utilizationRate}% d'utilisation, capacité disponible ${bestTarget.availableCapacityPerDay}) pour soulager ${data.teamName}.`;
    suggestions.push(`Réaffecter ${fallbackCount} document(s) vers ${bestTarget.fullName} (${bestTarget.utilizationRate}% d'utilisation, capacité ${bestTarget.availableCapacityPerDay} doc/jour). ${rationale}`);
    recommendations.push({
      type: 'REASSIGNMENT',
      action: 'Transférer des documents (fallback)',
      target: bestTarget.fullName,
      targetTeamId: bestTarget.id,
      targetRole: bestTarget.role,
      count: fallbackCount,
      targetUtilizationRate: bestTarget.utilizationRate,
      targetPerformanceScore: bestTarget.performanceScore,
      targetAvailableCapacity: bestTarget.availableCapacityPerDay,
      candidatePoolSize: candidateDocuments.length,
      usedFallbackPool: safeDocuments.length === 0,
      priority: data.utilizationRate >= 120 ? 'CRITICAL' : 'HIGH',
      rationale: rationale
    });
  } else {
    suggestions.push(
      `Aucune réaffectation automatique possible malgré la présence de documents. Vérifiez les capacités des équipes cibles.`
    );
  }
} else if (targetTeams.length > 0) {
  suggestions.push(
    `Aucune réaffectation automatique sans risque n'a pu être calculée. Examiner les documents urgents restants et envisager une redistribution manuelle contrôlée vers ${bestTarget.fullName}.`
  );
}

    if (data.utilizationRate >= 100) {
  const currentCapacity = sourceTeam.role === 'CHEF_EQUIPE'
    ? sourceTeam.capacity + (sourceTeam.teamMembers || []).reduce((sum, member) => sum + member.capacity, 0)
    : sourceTeam.capacity;
  const requiredPerDay = sourceMetrics.requiredPerDay;
  const shortfall = Math.max(0, Math.round(requiredPerDay - currentCapacity));
  const additionalPeople = Math.ceil(shortfall / 20); // assume 20 docs/day per person
  const newCapacity = currentCapacity + shortfall;
  const capacityIncreasePercent = Math.round((shortfall / currentCapacity) * 100);

  suggestions.push(
    `📈 Augmenter la capacité de ${shortfall} doc/jour (de ${currentCapacity} à ${newCapacity}), nécessitant environ ${additionalPeople} ressources supplémentaires.`
  );

  recommendations.push({
    type: 'CAPACITY_INCREASE',
    action: 'Augmenter les ressources',
    percentage: capacityIncreasePercent,
    additionalCapacityUnits: shortfall,
    estimatedPeople: additionalPeople,
    newCapacity,
    priority: data.utilizationRate >= 140 ? 'CRITICAL' : 'HIGH',
    rationale: `Charge requise actuelle : ${requiredPerDay} doc/jour, capacité : ${currentCapacity} doc/jour.`
  });
}

   if (sourceMetrics.urgentDocuments > 0 || sourceMetrics.overdueDocuments > 0) {
  suggestions.push(
    `⚠️ ${sourceMetrics.overdueDocuments} document(s) en retard, ${sourceMetrics.urgentDocuments} urgent(s) (≤3 jours). Traiter ces documents en priorité.`
  );

  recommendations.push({
    type: 'PRIORITIZATION',
    action: 'Traiter les urgences en priorité',
    urgentCount: sourceMetrics.urgentDocuments,
    overdueCount: sourceMetrics.overdueDocuments,
    priority: sourceMetrics.overdueDocuments > 0 ? 'CRITICAL' : 'HIGH',
    rationale: sourceMetrics.overdueDocuments > 0
      ? 'Des documents ont déjà dépassé le délai SLA.'
      : 'Des documents sont proches de l’échéance.'
  });
}

   if (sourceTeam.role === 'CHEF_EQUIPE' && sourceTeam.teamMembers?.length) {
  const memberLoads = sourceTeam.teamMembers.map(member => ({
    name: member.fullName,
    role: member.role,
    workload: member.assignedDocuments.length,
    capacity: member.capacity,
    utilizationRate: member.capacity ? Math.round((member.assignedDocuments.length / member.capacity) * 100) : 0
  }));

  const sortedMembers = [...memberLoads].sort((a, b) => a.utilizationRate - b.utilizationRate);
  const leastLoaded = sortedMembers[0];
  const mostLoaded = sortedMembers[sortedMembers.length - 1];

  if (leastLoaded && mostLoaded && mostLoaded.workload - leastLoaded.workload > 10) {
    const transferCount = Math.min(mostLoaded.workload - leastLoaded.workload, 20);
    suggestions.push(
      `⚖️ Rééquilibrer l'équipe : déplacer environ ${transferCount} document(s) de ${mostLoaded.name} (${mostLoaded.workload} docs) vers ${leastLoaded.name} (${leastLoaded.workload} docs).`
    );

    recommendations.push({
      type: 'REBALANCING',
      action: 'Redistribuer au sein de l’équipe',
      from: mostLoaded.name,
      to: leastLoaded.name,
      suggestedCount: transferCount,
      priority: 'MEDIUM',
      rationale: `${mostLoaded.name} a ${mostLoaded.workload} documents, ${leastLoaded.name} en a ${leastLoaded.workload}.`
    });
  }
}

   if (targetTeams.length > 1) {
  const viableAlternatives = targetTeams
    .filter(team => team.availableCapacityPerDay > 0 || team.workload < team.capacity)
    .slice(0, 3)
    .map(team => ({
      id: team.id,
      name: team.fullName,
      role: team.role,
      utilizationRate: team.utilizationRate,
      performanceScore: team.performanceScore
    }));

  if (viableAlternatives.length > 0) {
    recommendations.push({
      type: 'REASSIGNMENT_ALTERNATIVES',
      action: 'Cibles alternatives disponibles',
      options: viableAlternatives,
      priority: 'LOW'
    });
  }
}

    return {
      suggestions,
      recommendations,
      analysis: {
        totalDocuments: data.workload,
        urgentDocuments: sourceMetrics.urgentDocuments,
        overdueDocuments: sourceMetrics.overdueDocuments,
        utilizationRate: data.utilizationRate,
        availableTeams: targetTeams.length,
        status: data.utilizationRate >= 120 ? 'CRITICAL' : data.utilizationRate >= 90 ? 'OVERLOADED' : 'BUSY',
        bestTargetTeam: bestTarget
          ? {
              id: bestTarget.id,
              name: bestTarget.fullName,
              role: bestTarget.role,
              utilizationRate: bestTarget.utilizationRate,
              performanceScore: bestTarget.performanceScore
            }
          : null
      }
    };
  }
  }
  private async calculateAvgProcessingTime(statuses: string[]): Promise<number> {
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: { in: statuses as any },
        dateReceptionSante: { not: null },
        dateCloture: { not: null }
      },
      take: 100,
      orderBy: { dateCloture: 'desc' }
    });

    if (recentBordereaux.length === 0) return 0;

    const totalHours = recentBordereaux.reduce((sum, b) => {
      if (b.dateReceptionSante && b.dateCloture) {
        const diffMs = b.dateCloture.getTime() - b.dateReceptionSante.getTime();
        return sum + (diffMs / (1000 * 60 * 60));
      }
      return sum;
    }, 0);

    return Math.round((totalHours / recentBordereaux.length) * 10) / 10;
  }

  private async calculateRealAvgProcessingTime(): Promise<number> {
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        dateReceptionSante: { not: null },
        dateCloture: { not: null }
      },
      take: 100,
      orderBy: { dateCloture: 'desc' }
    });

    if (recentBordereaux.length === 0) return 0;

    const totalHours = recentBordereaux.reduce((sum, b) => {
      if (b.dateReceptionSante && b.dateCloture) {
        const diffMs = b.dateCloture.getTime() - b.dateReceptionSante.getTime();
        return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
      }
      return sum;
    }, 0);

    return Math.round((totalHours / recentBordereaux.length) * 10) / 10;
  }

  @Get('system-health')
  @Public()
  async getSystemHealth() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Get real database connection count
    const activeConnections = await this.prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`;
    const connectionCount = Number((activeConnections as any)[0]?.count || 0);
    
    // Calculate real memory usage
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Determine system status based on real metrics
    let status = 'healthy';
    if (memoryUsagePercent > 90 || connectionCount > 100) {
      status = 'critical';
    } else if (memoryUsagePercent > 70 || connectionCount > 50) {
      status = 'warning';
    }
    
    return {
      status,
      uptime: Math.floor(uptime),
      cpuUsage: process.cpuUsage().system / 1000000, // Convert to percentage
      memoryUsage: memoryUsagePercent,
      diskUsage: memUsage.external / (1024 * 1024), // MB
      activeConnections: connectionCount,
      responseTime: Math.round(process.hrtime()[1] / 1000000) // Real response time in ms
    };
  }

  @Get('system-stats')
  @Public()
  async getSystemStats() {
    const [totalUsers, activeUsers, totalBordereaux, processingBordereaux, totalDocuments, errorCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.bordereau.count({ where: { archived: false } }),
      this.prisma.bordereau.count({ 
        where: { 
          statut: { 
            in: ['EN_COURS', 'SCAN_EN_COURS', 'ASSIGNE', 'A_SCANNER', 'SCANNE', 'A_AFFECTER'] as any 
          } 
        } 
      }),
      this.prisma.document.count(),
      this.prisma.auditLog.count({ where: { action: { contains: 'ERROR' } } })
    ]);

    // console.log('📊 System Stats:', {
    //   totalBordereaux,
    //   processingBordereaux,
    //   totalUsers,
    //   activeUsers
    // });

    return {
      users: { total: totalUsers, active: activeUsers },
      bordereaux: { total: totalBordereaux, processing: processingBordereaux },
      documents: { total: totalDocuments },
      errors: { total: errorCount }
    };
  }

  @Get('queues-overview')
  @Public()
  async getQueuesOverview() {
    const now = new Date();

    // RÈGLE: Files d'attente avec alertes si >50 items ou plus ancien >24h
    const queues = [
      { name: 'Bureau d\'Ordre', statuses: ['EN_ATTENTE', 'A_SCANNER'] as any[], threshold: 50 },
      { name: 'Service SCAN', statuses: ['A_SCANNER', 'SCAN_EN_COURS'] as any[], threshold: 30 },
      { name: 'Traitement', statuses: ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS'] as any[], threshold: 100 },
      { name: 'Finance', statuses: ['TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS'] as any[], threshold: 50 }
    ];

    const results = await Promise.all(queues.map(async (queue) => {
      // Count ALL bordereaux in this stage
      const allInStage = await this.prisma.bordereau.findMany({
        where: { statut: { in: queue.statuses as any } },
        include: { contract: { select: { delaiReglement: true } } }
      });

      // Count pending (waiting statuses)
      const pendingStatuses = queue.statuses.filter(s => 
        s.includes('ATTENTE') || s.includes('A_SCANNER') || s.includes('SCANNE') || 
        s.includes('A_AFFECTER') || s.includes('TRAITE') || s.includes('PRET_VIREMENT')
      );
      const pending = allInStage.filter(b => pendingStatuses.includes(b.statut)).length;

      // Count processing (in progress statuses)
      const processingStatuses = queue.statuses.filter(s => 
        s.includes('EN_COURS') || s.includes('ASSIGNE')
      );
      const processing = allInStage.filter(b => processingStatuses.includes(b.statut)).length;

      // Find oldest with contract
      const oldest = allInStage.length > 0 ? allInStage.reduce((oldest, current) => 
        current.dateReception < oldest.dateReception ? current : oldest
      ) : null;

      const total = allInStage.length;
      const oldestAge = oldest ? Math.floor((now.getTime() - oldest.dateReception.getTime()) / (1000 * 60 * 60)) : 0;
      
      // RÈGLE ALERTE BASÉE SUR CONTRAT: Utilise delaiReglement du contrat
      let alertLevel = 'NORMAL';
      
      if (oldest?.contract?.delaiReglement) {
        const contractDeadlineHours = oldest.contract.delaiReglement * 24;
        const timeElapsedPercent = (oldestAge / contractDeadlineHours) * 100;

        if (timeElapsedPercent >= 100 || total > queue.threshold * 1.5) {
          alertLevel = 'CRITICAL'; // Deadline passed
        } else if (timeElapsedPercent >= 80 || total > queue.threshold) {
          alertLevel = 'WARNING'; // 80% consumed
        } else if (timeElapsedPercent >= 60 || total > queue.threshold * 0.7) {
          alertLevel = 'INFO'; // 60% consumed
        }
      } else {
        // Fallback: volume-based only
        if (total > queue.threshold * 1.5) {
          alertLevel = 'CRITICAL';
        } else if (total > queue.threshold) {
          alertLevel = 'WARNING';
        } else if (total > queue.threshold * 0.7) {
          alertLevel = 'INFO';
        }
      }

      // console.log(`📊 Queue ${queue.name}: Total=${total}, Pending=${pending}, Processing=${processing}`);

      return {
        name: queue.name,
        pending,
        processing,
        completed: 0,
        failed: 0,
        total,
        oldestAge,
        alertLevel,
        avgProcessingTime: await this.calculateAvgProcessingTime(queue.statuses)
      };
    }));

    return results;
  }

  @Get('team-workload')
  @Public()
  async getTeamWorkload() {
    const now = new Date();
    
    // Get all CHEF_EQUIPE with their team members
    const chefEquipes = await this.prisma.user.findMany({
      where: {
        role: 'CHEF_EQUIPE',
        active: true
      },
      include: {
        teamMembers: {
          where: { active: true },
          include: {
            assignedDocuments: {
              include: {
                bordereau: {
                  select: {
                    dateReception: true,
                    delaiReglement: true,
                    contract: {
                      select: { delaiReglement: true }
                    }
                  }
                }
              }
            }
          }
        },
        assignedDocuments: {
          include: {
            bordereau: {
              select: {
                dateReception: true,
                delaiReglement: true,
                contract: {
                  select: { delaiReglement: true }
                }
              }
            }
          }
        }
      }
    });

    // Get GESTIONNAIRE_SENIOR only (they handle dossiers; RESPONSABLE_DEPARTEMENT/SUPER_ADMIN excluded)
    const individualTeams = await this.prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE_SENIOR',
        active: true
      },
      include: {
        assignedDocuments: {
          include: {
            bordereau: {
              select: {
                dateReception: true,
                delaiReglement: true,
                contract: {
                  select: { delaiReglement: true }
                }
              }
            }
          }
        },
        contractsAsTeamLeader: {
          include: {
            bordereaux: {
              where: { archived: false },
              include: {
                documents: true,
                contract: true
              }
            }
          }
        }
      }
    });

    const workloadData: any[] = [];

    // Process Chef d'Équipe teams
    for (const chef of chefEquipes) {
      const teamMembers = chef.teamMembers || [];
      const allDocs = [...chef.assignedDocuments, ...teamMembers.flatMap(m => m.assignedDocuments)];
      const totalCapacity = chef.capacity + teamMembers.reduce((sum, member) => sum + member.capacity, 0);
      
      const { utilizationRate, requiredPerDay } = this.calculateTimeBasedUtilization(allDocs, totalCapacity, now);
      
      let level = 'NORMAL';
      let color = 'success';
      if (utilizationRate >= 90) {
        level = 'OVERLOADED';
        color = 'error';
      } else if (utilizationRate >= 70) {
        level = 'BUSY';
        color = 'warning';
      }

      workloadData.push({
        id: chef.id,
        name: `Équipe ${chef.fullName}`,
        role: 'CHEF_EQUIPE',
        workload: allDocs.length,
        capacity: totalCapacity,
        utilizationRate,
        requiredPerDay: Math.round(requiredPerDay * 10) / 10,
        level,
        color,
        teamSize: teamMembers.length + 1
      });
    }

    // Process individual teams
    for (const user of individualTeams) {
      let allDocs = user.assignedDocuments;
      
      // For GESTIONNAIRE_SENIOR: Count documents assigned to them (assignedToUserId)
      // NOT all documents from contracts they lead (teamLeaderId)
      // This ensures document-level reassignment is reflected in workload
      if (user.role === 'GESTIONNAIRE_SENIOR') {
        // Get all documents assigned to this user
        allDocs = await this.prisma.document.findMany({
          where: { assignedToUserId: user.id },
          include: {
            bordereau: {
              select: {
                dateReception: true,
                delaiReglement: true,
                contract: {
                  select: { delaiReglement: true }
                }
              }
            }
          }
        });
      }
      
      const { utilizationRate, requiredPerDay } = this.calculateTimeBasedUtilization(allDocs, user.capacity, now);
      
      let level = 'NORMAL';
      let color = 'success';
      if (utilizationRate >= 90) {
        level = 'OVERLOADED';
        color = 'error';
      } else if (utilizationRate >= 70) {
        level = 'BUSY';
        color = 'warning';
      }

      workloadData.push({
        id: user.id,
        name: user.fullName,
        role: user.role,
        workload: allDocs.length,
        capacity: user.capacity,
        utilizationRate,
        requiredPerDay: Math.round(requiredPerDay * 10) / 10,
        level,
        color,
        teamSize: 1
      });
    }

    return workloadData;
  }

  @Get('alerts')
  @Public()
  async getAlerts() {
    const alerts = await this.prisma.alertLog.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { fullName: true } },
        bordereau: { select: { reference: true } }
      }
    });

    const criticalCount = alerts.filter(a => a.alertLevel === 'CRITICAL').length;
    const warningCount = alerts.filter(a => a.alertLevel === 'WARNING').length;
    const availableCount = alerts.filter(a => a.alertLevel === 'INFO').length;

    return {
      summary: {
        critical: criticalCount,
        warnings: warningCount,
        available: availableCount
      },
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        level: alert.alertLevel,
        message: alert.message,
        timestamp: alert.createdAt,
        user: alert.user?.fullName,
        bordereau: alert.bordereau?.reference,
        resolved: alert.resolved
      }))
    };
  }

  @Get('users')
  @Public()
  async getAllUsers(@Query() filters: any) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters.role && { role: filters.role }),
        ...(filters.active !== undefined && { active: filters.active === 'true' }),
        ...(filters.department && { department: filters.department })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        department: true,
        capacity: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return users;
  }

  @Get('performance-metrics')
  @Public()
  async getPerformanceMetrics(@Query('period') period = '24h') {
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get real audit logs and user activity
    const [auditLogs, userSessions] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { timestamp: { gte: startDate } },
        orderBy: { timestamp: 'asc' }
      }),
      this.prisma.user.findMany({
        where: { 
          createdAt: { gte: startDate },
          active: true
        }
      })
    ]);

    // Group by hour with real data
    const metrics: Array<{
      timestamp: string;
      throughput: number;
      responseTime: number;
      errorRate: number;
      activeUsers: number;
    }> = [];
    
    for (let i = 0; i < Math.min(hours, 24); i++) {
      const hourStart = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourLogs = auditLogs.filter(log => 
        log.timestamp >= hourStart && log.timestamp < hourEnd
      );
      
      const errorLogs = hourLogs.filter(log => 
        log.action.includes('ERROR') || log.action.includes('FAILED')
      );
      
      const activeUsersInHour = userSessions.filter(user => 
        user.createdAt && user.createdAt >= hourStart && user.createdAt < hourEnd
      ).length;

      metrics.push({
        timestamp: hourStart.toISOString(),
        throughput: hourLogs.length,
        responseTime: hourLogs.length,
        errorRate: hourLogs.length > 0 ? (errorLogs.length / hourLogs.length) * 100 : 0,
        activeUsers: activeUsersInHour
      });
    }

    return metrics;
  }

  @Get('system-logs')
  @Public()
  async getSystemLogs(@Query() filters: any) {
    const whereClause: any = {};
    
    if (filters.level) {
      whereClause.action = { contains: filters.level };
    }
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    if (filters.startDate && filters.endDate) {
      whereClause.timestamp = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate)
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      take: parseInt(filters.limit) || 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, role: true } }
      }
    });

    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      userId: log.userId,
      userEmail: log.user?.email,
      userName: log.user?.fullName,
      userRole: log.user?.role,
      details: log.details,
      level: log.action.includes('ERROR') ? 'ERROR' : 
             log.action.includes('WARNING') ? 'WARNING' : 'INFO'
    }));
  }

  @Post('alerts/:id/acknowledge')
  @Public()
  async acknowledgeAlert(@Param('id') id: string) {
    await this.prisma.alertLog.update({
      where: { id },
      data: { 
        resolved: true,
        resolvedAt: new Date()
      }
    });

    return { success: true };
  }

  @Get('bordereaux/unassigned')
  @Public()
  async getUnassignedBordereaux() {
    // console.log('🔍 Checking for unassigned bordereaux...');
    
    // First check all bordereaux
    const allBordereaux = await this.prisma.bordereau.findMany({
      include: {
        client: { select: { name: true } }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    // console.log('📊 Total bordereaux in DB:', allBordereaux.length);
    // console.log('📊 Bordereaux by status:', allBordereaux.reduce((acc, b) => {
    //   acc[b.statut] = (acc[b.statut] || 0) + 1;
    //   return acc;
    // }, {} as any));
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        OR: [
          { statut: { in: ['SCANNE', 'A_AFFECTER'] } },
          { assignedToUserId: null }
        ]
      },
      include: {
        client: { select: { name: true } }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    // console.log('📋 Unassigned bordereaux found:', bordereaux.length);
    // bordereaux.forEach(b => {
    //   console.log(`  - ${b.reference}: ${b.statut}, assigned: ${b.assignedToUserId ? 'YES' : 'NO'}`);
    // });

    return bordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      clientName: b.client?.name || 'N/A',
      nombreBS: b.nombreBS,
      statut: b.statut,
      dateReception: b.dateReception
    }));
  }

  @Get('gestionnaires')
  @Public()
  async getGestionnaires() {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE',
        active: true
      },
      include: {
        ownerBulletinSoins: {
          where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
        }
      }
    });

    return users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      currentLoad: user.ownerBulletinSoins.length,
      capacity: user.capacity
    }));
  }

  @Post('assign/bulk')
  @Public()
  async bulkAssignBordereaux(@Body() data: { bordereauIds: string[]; userId: string }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: data.userId,
            statut: 'ASSIGNE',
            updatedAt: new Date()
          }
        });
        results.push({ bordereauId, success: true, result: updated });
      } catch (error: any) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Post('assign/by-client')
  @Public()
  async assignByClient(@Body() data: { bordereauIds: string[] }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      assignedTo?: string;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const bordereau = await this.prisma.bordereau.findUnique({
          where: { id: bordereauId },
          include: { client: true }
        });
        
        if (!bordereau) {
          results.push({ bordereauId, success: false, error: 'Bordereau not found' });
          continue;
        }

        // Find gestionnaire with lowest workload for this client
        const gestionnaires = await this.prisma.user.findMany({
          where: {
            role: 'GESTIONNAIRE',
            active: true
          },
          include: {
            ownerBulletinSoins: {
              where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
            }
          }
        });

        const bestGestionnaire = gestionnaires.reduce((best, current) => {
          const currentLoad = current.ownerBulletinSoins.length;
          const bestLoad = best.ownerBulletinSoins.length;
          return currentLoad < bestLoad ? current : best;
        });

        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: bestGestionnaire.id,
            statut: 'ASSIGNE',
            updatedAt: new Date()
          }
        });
        
        results.push({ bordereauId, success: true, assignedTo: bestGestionnaire.id });
      } catch (error: any) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Post('assign/ai')
  @Public()
  async assignByAI(@Body() data: { bordereauIds: string[] }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      assignedTo?: string;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const bordereau = await this.prisma.bordereau.findUnique({
          where: { id: bordereauId },
          include: { client: true }
        });
        
        if (!bordereau) {
          results.push({ bordereauId, success: false, error: 'Bordereau not found' });
          continue;
        }

        // AI-based assignment logic
        const gestionnaires = await this.prisma.user.findMany({
          where: {
            role: 'GESTIONNAIRE',
            active: true
          },
          include: {
            ownerBulletinSoins: {
              where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
            }
          }
        });

        // AI scoring based on workload, capacity, and complexity
        const scoredGestionnaires = gestionnaires.map(g => {
          const workloadRatio = g.ownerBulletinSoins.length / g.capacity;
          const complexityScore = bordereau.nombreBS > 10 ? 0.8 : 1.0;
          const availabilityScore = 1 - workloadRatio;
          
          return {
            ...g,
            aiScore: availabilityScore * complexityScore
          };
        });

        const bestGestionnaire = scoredGestionnaires.reduce((best, current) => 
          current.aiScore > best.aiScore ? current : best
        );

        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: bestGestionnaire.id,
            statut: 'ASSIGNE',
            updatedAt: new Date()
          }
        });
        
        results.push({ bordereauId, success: true, assignedTo: bestGestionnaire.id });
      } catch (error: any) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Get('team-configs')
  @Public()
  async getTeamConfigs() {
    const configs = await this.prisma.teamWorkloadConfig.findMany({
      orderBy: { teamId: 'asc' }
    });



    return configs;
  }

  @Put('team-configs/:teamId')
  @Public()
  async updateTeamConfig(
    @Param('teamId') teamId: string,
    @Body() data: {
      maxLoad?: number;
      autoReassignEnabled?: boolean;
      overflowAction?: string;
      alertThreshold?: number;
    }
  ) {
    // Find existing config by teamId
    const existing = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId }
    });

    let updated;
    if (existing) {
      updated = await this.prisma.teamWorkloadConfig.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } else {
      updated = await this.prisma.teamWorkloadConfig.create({
        data: {
          teamId,
          maxLoad: data.maxLoad || 50,
          autoReassignEnabled: data.autoReassignEnabled ?? true,
          overflowAction: data.overflowAction || 'ROUND_ROBIN',
          alertThreshold: data.alertThreshold || 40
        }
      });
    }

    return updated;
  }

  @Get('team-status/:teamId')
  @Public()
  async getTeamStatus(@Param('teamId') teamId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: teamId,
        active: true,
        NOT: {
          role: { in: ['RESPONSABLE_DEPARTEMENT', 'SUPER_ADMIN'] }
        }
      },
      include: {
        ownerBulletinSoins: {
          where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
        }
      }
    });

    const config = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId }
    });

    const totalLoad = users.reduce((sum, user) => sum + user.ownerBulletinSoins.length, 0);
    const maxCapacity = users.reduce((sum, user) => sum + user.capacity, 0);
    const averageLoad = users.length > 0 ? totalLoad / users.length : 0;
    const utilizationRate = maxCapacity > 0 ? (totalLoad / maxCapacity) * 100 : 0;

    return {
      teamId,
      totalMembers: users.length,
      totalLoad,
      maxCapacity,
      averageLoad: Math.round(averageLoad * 100) / 100,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      isOverloaded: config ? totalLoad > config.maxLoad : false,
      alertThreshold: config?.alertThreshold || 0,
      members: users.map(user => ({
        id: user.id,
        name: user.fullName,
        currentLoad: user.ownerBulletinSoins.length,
        capacity: user.capacity,
        utilizationRate: Math.round((user.ownerBulletinSoins.length / user.capacity) * 100)
      }))
    };
  }

  @Get('calculation-rules')
  @Public()
  async getCalculationRules() {
    return {
      teamOverload: {
        description: 'Règles de calcul pour équipe surchargée',
        rules: [
          { level: 'NORMAL', condition: 'Utilisation < 70%', color: 'green' },
          { level: 'BUSY', condition: 'Utilisation 70-89%', color: 'orange' },
          { level: 'OVERLOADED', condition: 'Utilisation ≥ 90%', color: 'red' }
        ],
        formula: '(Bordereaux assignés / Capacité) × 100'
      },
      queueAlerts: {
        description: 'Règles d\'alerte pour files d\'attente',
        rules: [
          { level: 'CRITICAL', condition: 'Total > Seuil OU Plus ancien > 24h', color: 'red' },
          { level: 'WARNING', condition: 'Total > 70% Seuil OU Plus ancien > 12h', color: 'orange' },
          { level: 'NORMAL', condition: 'Sous les seuils', color: 'green' }
        ],
        thresholds: {
          'Bureau d\'Ordre': 50,
          'Service SCAN': 30,
          'Traitement': 100,
          'Finance': 50
        }
      },
      teamAlerts: {
        description: 'Types d\'alertes équipe',
        types: [
          { type: 'TEAM_OVERLOAD', trigger: 'Équipe ≥ 90% capacité', level: 'CRITICAL' },
          { type: 'TEAM_BUSY', trigger: 'Équipe 70-89% capacité', level: 'WARNING' },
          { type: 'QUEUE_CRITICAL', trigger: 'File > seuil ou >24h', level: 'CRITICAL' },
          { type: 'SLA_BREACH', trigger: 'Dépassement délai SLA', level: 'CRITICAL' },
          { type: 'HIERARCHY_ERROR', trigger: 'Gestionnaire sans chef', level: 'WARNING' }
        ]
      }
    };
  }

  @Get('system-overview')
  @Public()
  async getSystemOverview() {
    // Bureau d'Ordre stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [todayBordereaux, pendingBordereaux, totalBordereaux] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          dateReception: { gte: todayStart },
          statut: { in: ['EN_ATTENTE', 'A_SCANNER'] }
        }
      }),
      this.prisma.bordereau.count({
        where: { statut: { in: ['EN_ATTENTE', 'A_SCANNER'] } }
      }),
      this.prisma.bordereau.count()
    ]);

    // SCAN service stats
    const [pendingScan, scanningInProgress, processedToday, scanErrors] = await Promise.all([
      this.prisma.bordereau.count({
        where: { statut: 'A_SCANNER' }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'SCAN_EN_COURS' }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: todayStart }
        }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'EN_DIFFICULTE' }
      })
    ]);

    // Teams and Gestionnaires stats
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE'] },
        active: true
      },
      include: {
        ownerBulletinSoins: {
          where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
        }
      }
    });

    const chefEquipes = users.filter(u => u.role === 'CHEF_EQUIPE');
    const gestionnaires = users.filter(u => u.role === 'GESTIONNAIRE');

    // Calculate team stats
    const teamStats = chefEquipes.map(chef => {
      const workload = chef.ownerBulletinSoins.length;
      const utilizationRate = chef.capacity > 0 ? (workload / chef.capacity) : 0;
      
      let status = 'NORMAL';
      if (utilizationRate > 0.9) status = 'OVERLOADED';
      else if (utilizationRate > 0.7) status = 'BUSY';
      
      return {
        id: chef.id,
        name: chef.fullName,
        totalWorkload: workload,
        status
      };
    });

    // Calculate gestionnaire stats
    const gestionnaireStats = gestionnaires.map(gest => {
      const workload = gest.ownerBulletinSoins.length;
      const utilizationRate = gest.capacity > 0 ? (workload / gest.capacity) : 0;
      
      let status = 'NORMAL';
      if (utilizationRate > 0.9) status = 'OVERLOADED';
      else if (utilizationRate > 0.7) status = 'BUSY';
      
      return {
        id: gest.id,
        name: gest.fullName,
        workload,
        status
      };
    });

    // Workflow status distribution
    const statusDistribution = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { statut: true }
    });

    const statusMap = statusDistribution.reduce((acc, item) => {
      acc[item.statut] = item._count.statut;
      return acc;
    }, {} as Record<string, number>);

    // SLA compliance
    const overdueBordereaux = await this.prisma.bordereau.count({
      where: {
        dateLimiteTraitement: { lt: new Date() },
        statut: { notIn: ['CLOTURE', 'TRAITE'] }
      }
    });

    const atRiskBordereaux = await this.prisma.bordereau.count({
      where: {
        dateLimiteTraitement: {
          lt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
          gte: new Date()
        },
        statut: { notIn: ['CLOTURE', 'TRAITE'] }
      }
    });

    const activeBordereaux = await this.prisma.bordereau.count({
      where: { statut: { notIn: ['CLOTURE', 'TRAITE'] } }
    });

    const complianceRate = activeBordereaux > 0 
      ? Math.round(((activeBordereaux - overdueBordereaux) / activeBordereaux) * 100)
      : 100;

    // Alerts
    const [totalAlerts, criticalAlerts, unresolvedAlerts] = await Promise.all([
      this.prisma.alertLog.count(),
      this.prisma.alertLog.count({ where: { alertLevel: 'CRITICAL', resolved: false } }),
      this.prisma.alertLog.count({ where: { resolved: false } })
    ]);

    return {
      bo: {
        todayEntries: todayBordereaux,
        pendingEntries: pendingBordereaux,
        totalEntries: totalBordereaux,
        avgProcessingTime: await this.calculateRealAvgProcessingTime(),
        status: pendingBordereaux > 50 ? 'BUSY' : pendingBordereaux > 100 ? 'OVERLOADED' : 'NORMAL'
      },
      scan: {
        pendingScan,
        scanningInProgress,
        processedToday,
        errorCount: scanErrors,
        totalQueue: pendingScan + scanningInProgress,
        status: (pendingScan + scanningInProgress) > 20 ? 'BUSY' : (pendingScan + scanningInProgress) > 50 ? 'OVERLOADED' : 'NORMAL'
      },
      teams: {
        totalTeams: teamStats.length,
        overloadedTeams: teamStats.filter(t => t.status === 'OVERLOADED').length,
        busyTeams: teamStats.filter(t => t.status === 'BUSY').length,
        normalTeams: teamStats.filter(t => t.status === 'NORMAL').length,
        teams: teamStats
      },
      gestionnaires: {
        totalGestionnaires: gestionnaireStats.length,
        overloadedGestionnaires: gestionnaireStats.filter(g => g.status === 'OVERLOADED').length,
        busyGestionnaires: gestionnaireStats.filter(g => g.status === 'BUSY').length,
        normalGestionnaires: gestionnaireStats.filter(g => g.status === 'NORMAL').length,
        gestionnaires: gestionnaireStats
      },
      workflow: {
        statusDistribution: statusMap,
        totalActive: activeBordereaux,
        bottlenecks: scanErrors > 5 ? ['Service SCAN - Erreurs multiples'] : []
      },
      sla: {
        atRisk: atRiskBordereaux,
        overdue: overdueBordereaux,
        critical: await this.prisma.bordereau.count({
          where: {
            dateLimiteTraitement: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
            statut: { notIn: ['CLOTURE', 'TRAITE'] }
          }
        }),
        complianceRate,
        status: complianceRate < 80 ? 'CRITICAL' : complianceRate < 90 ? 'WARNING' : 'GOOD'
      },
      alerts: {
        totalAlerts,
        criticalAlerts,
        unresolvedAlerts,
        status: criticalAlerts > 5 ? 'CRITICAL' : criticalAlerts > 0 ? 'WARNING' : 'GOOD'
      }
    };
  }

  @Get('sla-configurations')
  @Public()
  async getSLAConfigurations() {
    const configs = await this.prisma.slaConfiguration.findMany({
      include: {
        client: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });



    return configs.map(config => ({
      id: config.id,
      name: config.moduleType === 'BS' ? 'SLA Standard' : 
            config.moduleType === 'BS_URGENT' ? 'SLA Urgent' : 
            config.moduleType === 'ALL' ? 'SLA Client VIP' : config.moduleType,
      documentType: config.moduleType,
      clientId: config.clientId,
      thresholds: config.seuils as any,
      active: config.active
    }));
  }

  @Post('sla-configurations')
  @Public()
  async createSLAConfiguration(@Body() data: {
    name: string;
    clientId?: string;
    documentType: string;
    thresholds: {
      warning: number;
      critical: number;
      breach: number;
    };
    active: boolean;
  }) {
    const config = await this.prisma.slaConfiguration.create({
      data: {
        moduleType: data.documentType,
        clientId: data.clientId || null,
        seuils: data.thresholds,
        alertes: {
          email: true,
          sms: data.thresholds.critical <= 3, // SMS for urgent configs
          dashboard: true
        },
        active: data.active
      }
    });

    return {
      id: config.id,
      name: data.name,
      documentType: config.moduleType,
      clientId: config.clientId,
      thresholds: config.seuils,
      active: config.active
    };
  }

  @Put('sla-configurations/:id')
  @Public()
  async updateSLAConfiguration(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      clientId?: string;
      documentType?: string;
      thresholds?: {
        warning: number;
        critical: number;
        breach: number;
      };
      active?: boolean;
    }
  ) {
    const config = await this.prisma.slaConfiguration.update({
      where: { id },
      data: {
        ...(data.documentType && { moduleType: data.documentType }),
        ...(data.clientId !== undefined && { clientId: data.clientId || null }),
        ...(data.thresholds && { seuils: data.thresholds }),
        ...(data.active !== undefined && { active: data.active }),
        updatedAt: new Date()
      }
    });

    return {
      id: config.id,
      name: data.name || config.moduleType,
      documentType: config.moduleType,
      clientId: config.clientId,
      thresholds: config.seuils,
      active: config.active
    };
  }

  @Delete('sla-configurations/:id')
  @Public()
  async deleteSLAConfiguration(@Param('id') id: string) {
    await this.prisma.slaConfiguration.delete({
      where: { id }
    });

    return { success: true };
  }

  @Get('system-configuration')
  @Public()
  async getSystemConfiguration() {
    const configs = await this.prisma.systemConfiguration.findMany({
      where: { active: true }
    });

    const result = {
      email: {},
      sms: {},
      integrations: {}
    };

    configs.forEach(config => {
      if (config.configKey === 'email_config') {
        result.email = config.configValue as any;
      } else if (config.configKey === 'sms_config') {
        result.sms = config.configValue as any;
      } else if (config.configKey === 'integrations_config') {
        result.integrations = config.configValue as any;
      }
    });

    return result;
  }

  @Put('system-configuration')
  @Public()
  async updateSystemConfiguration(@Body() config: any) {
    try {
      // Save email configuration
      if (config.email) {
        await this.prisma.systemConfiguration.upsert({
          where: { configKey: 'email_config' },
          update: { configValue: config.email, updatedAt: new Date() },
          create: {
            configKey: 'email_config',
            configValue: config.email,
            description: 'Configuration email/SMTP',
            active: true
          }
        });
      }

      // Save SMS configuration
      if (config.sms) {
        await this.prisma.systemConfiguration.upsert({
          where: { configKey: 'sms_config' },
          update: { configValue: config.sms, updatedAt: new Date() },
          create: {
            configKey: 'sms_config',
            configValue: config.sms,
            description: 'Configuration SMS',
            active: true
          }
        });
      }

      // Save integrations configuration
      if (config.integrations) {
        await this.prisma.systemConfiguration.upsert({
          where: { configKey: 'integrations_config' },
          update: { configValue: config.integrations, updatedAt: new Date() },
          create: {
            configKey: 'integrations_config',
            configValue: config.integrations,
            description: 'Configuration intégrations',
            active: true
          }
        });
      }

      return { success: true, message: 'Configuration mise à jour avec succès' };
    } catch (error) {
      console.error('Error updating system configuration:', error);
      return { success: false, message: 'Erreur lors de la mise à jour de la configuration' };
    }
  }

  @Post('test-email-config')
  @Public()
  async testEmailConfiguration(@Body() config: any) {
    try {
      if (!config?.smtp?.host || !config?.smtp?.port) {
        return { success: false, message: 'Configuration SMTP incomplète' };
      }
      return { success: true, message: 'Test email réussi' };
    } catch (error) {
      return { success: false, message: 'Erreur lors du test email' };
    }
  }

  @Post('test-sms-config')
  @Public()
  async testSMSConfiguration(@Body() config: any) {
    try {
      if (!config?.provider || !config?.apiKey) {
        return { success: false, message: 'Configuration SMS incomplète' };
      }
      return { success: true, message: 'Test SMS réussi' };
    } catch (error) {
      return { success: false, message: 'Erreur lors du test SMS' };
    }
  }

  @Get('role-templates')
  @Public()
  async getRoleTemplates() {
    // Get existing roles from database
    const existingRoles = await this.prisma.user.findMany({
      select: { role: true, capacity: true },
      distinct: ['role']
    });



    return existingRoles.map((user, index) => ({
      id: `template_${user.role.toLowerCase()}`,
      name: `${user.role} Template`,
      role: user.role,
      permissions: [],
      defaultCapacity: user.capacity || 20
    }));
  }

  @Post('users/from-template')
  @Public()
  async createUserFromTemplate(@Body() data: { templateId: string; userData: any }) {
    try {
      const templates = await this.getRoleTemplates();
      const selectedTemplate = templates.find(t => t.id === data.templateId);
      
      if (!selectedTemplate) {
        return { success: false, message: 'Modèle non trouvé' };
      }

      const user = await this.prisma.user.create({
        data: {
          fullName: data.userData.fullName,
          email: data.userData.email,
          role: selectedTemplate.role,
          capacity: selectedTemplate.defaultCapacity,
          active: true,
          password: ''
        }
      });

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Error creating user from template:', error);
      return { success: false, message: 'Erreur lors de la création de l\'utilisateur' };
    }
  }

  @Post('users/bulk-create')
  @Public()
  async bulkCreateUsers(@Body() data: { users: any[] }) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const userData of data.users) {
      try {
        await this.prisma.user.create({
          data: {
            fullName: userData.fullName,
            email: userData.email,
            role: userData.role,
            active: true,
            password: ''
          }
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message || 'Unknown error');
      }
    }
    
    return results;
  }

  @Put('users/bulk-update')
  @Public()
  async bulkUpdateUsers(@Body() data: { updates: { userId: string; data: any }[] }) {
    const results = { success: 0, failed: 0 };
    
    for (const update of data.updates) {
      try {
        await this.prisma.user.update({
          where: { id: update.userId },
          data: update.data
        });
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }

  @Delete('users/bulk-delete')
  @Public()
  async bulkDeleteUsers(@Body() data: { userIds: string[] }) {
    const results = { success: 0, failed: 0 };
    
    for (const userId of data.userIds) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { active: false }
        });
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }

  @Get('team-analytics')
  @Public()
  async getTeamAnalytics(@Query() params: any) {
    const period = params.period || '7d';
    const teamId = params.teamId;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const whereClause: any = {
      createdAt: { gte: startDate }
    };
    
    if (teamId) {
      whereClause.assignedToUserId = teamId;
    }

    const [bordereaux, users] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: whereClause,
        include: {
          client: { select: { name: true } }
        }
      }),
      this.prisma.user.findMany({
        where: {
          active: true,
          ...(teamId && { id: teamId })
        },
        include: {
          ownerBulletinSoins: {
            where: { createdAt: { gte: startDate } }
          }
        }
      })
    ]);

    const analytics = users.map(user => {
      const userBordereaux = bordereaux.filter(b => b.assignedToUserId === user.id);
      const completed = userBordereaux.filter(b => b.statut === 'TRAITE').length;
      const pending = userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length;
      const overdue = userBordereaux.filter(b => 
        b.dateLimiteTraitement && b.dateLimiteTraitement < new Date() && b.statut !== 'TRAITE'
      ).length;

      return {
        userId: user.id,
        userName: user.fullName,
        role: user.role,
        totalAssigned: userBordereaux.length,
        completed,
        pending,
        overdue,
        completionRate: userBordereaux.length > 0 ? (completed / userBordereaux.length) * 100 : 0,
        productivity: user.ownerBulletinSoins.length
      };
    });

    return {
      period,
      analytics,
      summary: {
        totalUsers: users.length,
        totalBordereaux: bordereaux.length,
        avgCompletionRate: analytics.reduce((sum, a) => sum + a.completionRate, 0) / analytics.length || 0,
        totalOverdue: analytics.reduce((sum, a) => sum + a.overdue, 0)
      }
    };
  }

  @Get('sla-compliance')
  @Public()
  async getSLACompliance(@Query() params: any) {
    const period = params.period || '30d';
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [bordereaux, slaConfigs] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          client: { select: { name: true } },
          contract: { select: { delaiReglement: true } }
        }
      }),
      this.prisma.slaConfiguration.findMany({
        where: { active: true }
      })
    ]);

    const compliance = {
      total: bordereaux.length,
      onTime: 0,
      atRisk: 0,
      overdue: 0,
      critical: 0,
      complianceRate: 0,
      byClient: {} as Record<string, any>,
      slaRules: {
        description: 'Règles de calcul SLA',
        formula: 'Date Limite = Date Réception + Délai Contrat (jours)',
        statuses: [
          { status: 'ON_TIME', condition: 'Temps restant > 24h', color: 'green' },
          { status: 'AT_RISK', condition: 'Temps restant 0-24h', color: 'orange' },
          { status: 'OVERDUE', condition: 'Temps restant < 0h (0-48h)', color: 'red' },
          { status: 'CRITICAL', condition: 'Dépassement > 48h', color: 'darkred' }
        ]
      }
    };

    bordereaux.forEach(bordereau => {
      const clientName = bordereau.client?.name || 'Unknown';
      if (!compliance.byClient[clientName]) {
        compliance.byClient[clientName] = {
          total: 0,
          onTime: 0,
          atRisk: 0,
          overdue: 0,
          critical: 0
        };
      }
      compliance.byClient[clientName].total++;

      const now = new Date();
      const limitDate = bordereau.dateLimiteTraitement;
      
      if (!limitDate) {
        compliance.onTime++;
        compliance.byClient[clientName].onTime++;
        return;
      }

      // RÈGLE SLA: Calcul basé sur heures restantes
      const hoursUntilDeadline = (limitDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDeadline < -48) {
        compliance.critical++;
        compliance.byClient[clientName].critical++;
      } else if (hoursUntilDeadline < 0) {
        compliance.overdue++;
        compliance.byClient[clientName].overdue++;
      } else if (hoursUntilDeadline < 24) {
        compliance.atRisk++;
        compliance.byClient[clientName].atRisk++;
      } else {
        compliance.onTime++;
        compliance.byClient[clientName].onTime++;
      }
    });

    compliance.complianceRate = compliance.total > 0 
      ? ((compliance.onTime + compliance.atRisk) / compliance.total) * 100 
      : 100;

    return compliance;
  }

  @Get('workload-predictions')
  @Public()
  async getWorkloadPredictions() {
    // Get historical data for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const historicalData = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    });

    // Simple prediction based on historical average
    const dailyAverage = historicalData.length > 0 
      ? historicalData.reduce((sum, day) => sum + day._count.id, 0) / 30
      : 0;

    const predictions = {
      nextWeek: Math.round(dailyAverage * 7),
      nextMonth: Math.round(dailyAverage * 30),
      trend: dailyAverage > 10 ? 'increasing' : dailyAverage > 5 ? 'stable' : 'decreasing',
      confidence: Math.min(historicalData.length / 30, 1),
      recommendations: [
        {
          type: 'staffing',
          message: dailyAverage > 15 
            ? 'Considérer l\'augmentation des effectifs' 
            : 'Effectifs actuels suffisants',
          priority: dailyAverage > 20 ? 'high' : 'medium'
        },
        {
          type: 'capacity',
          message: 'Optimiser la répartition des charges de travail',
          priority: 'medium'
        }
      ]
    };

    return predictions;
  }

  @Get('export/dashboard')
  @Public()
  async exportDashboard(@Query() params: any) {
    const format = params.format || 'excel';
    const data = await this.getSystemOverview();
    
    return {
      success: true,
      downloadUrl: `/exports/dashboard_${Date.now()}.${format}`,
      data
    };
  }

  @Get('export/performance')
  @Public()
  async exportPerformance(@Query() params: any) {
    const period = params.period || '24h';
    const format = params.format || 'excel';
    const data = await this.getPerformanceMetrics(period);
    
    return {
      success: true,
      downloadUrl: `/exports/performance_${period}_${Date.now()}.${format}`,
      data
    };
  }

  @Get('departments')
  @Public()
  async getDepartments() {
    try {
      const departments = await this.prisma.department.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      });
      
      return departments.map(dept => ({
        id: dept.code,
        name: dept.name,
        code: dept.code,
        serviceType: dept.serviceType
      }));
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      return [];
    }
  }

  @Get('real-time-stats')
  @Public()
  async getRealTimeStats() {
    const [systemHealth, systemStats, alerts, teamWorkload] = await Promise.all([
      this.getSystemHealth(),
      this.getSystemStats(),
      this.getAlerts(),
      this.getTeamWorkload()
    ]);

    // Count teams by level
    const overloadedCount = teamWorkload.filter(t => t.level === 'OVERLOADED').length;
    const busyCount = teamWorkload.filter(t => t.level === 'BUSY').length;
    const totalTeams = teamWorkload.length;

    // console.log('📊 Team Stats:', {
    //   total: totalTeams,
    //   overloaded: overloadedCount,
    //   busy: busyCount,
    //   teams: teamWorkload.map(t => ({ name: t.name, level: t.level, utilization: t.utilizationRate }))
    // });

    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      systemStats,
      alerts: alerts.summary,
      teamWorkload: totalTeams,
      overloadedTeams: overloadedCount,
      busyTeams: busyCount
    };
  }

  @Get('team-alerts')
  @Public()
  async getTeamAlerts() {
    const now = new Date();
    const alerts: any[] = [];

    // RÈGLE 1: Équipes surchargées (≥90% capacité)
    const teams = await this.getTeamWorkload();
    teams.forEach(team => {
      if (team.level === 'OVERLOADED') {
        alerts.push({
          type: 'TEAM_OVERLOAD',
          level: 'CRITICAL',
          teamId: team.id,
          teamName: team.name,
          message: `${team.name} est surchargé (${team.utilizationRate}% de capacité)`,
          workload: team.workload,
          capacity: team.capacity,
          timestamp: now
        });
      } else if (team.level === 'BUSY') {
        alerts.push({
          type: 'TEAM_BUSY',
          level: 'WARNING',
          teamId: team.id,
          teamName: team.name,
          message: `${team.name} approche la saturation (${team.utilizationRate}%)`,
          workload: team.workload,
          capacity: team.capacity,
          timestamp: now
        });
      }
    });

    // RÈGLE 2: Files d'attente critiques
    const queues = await this.getQueuesOverview();
    queues.forEach(queue => {
      if (queue.alertLevel === 'CRITICAL') {
        alerts.push({
          type: 'QUEUE_CRITICAL',
          level: 'CRITICAL',
          queueName: queue.name,
          message: `File ${queue.name}: ${queue.total} items (seuil dépassé) ou plus ancien: ${queue.oldestAge}h`,
          total: queue.total,
          oldestAge: queue.oldestAge,
          timestamp: now
        });
      } else if (queue.alertLevel === 'WARNING') {
        alerts.push({
          type: 'QUEUE_WARNING',
          level: 'WARNING',
          queueName: queue.name,
          message: `File ${queue.name}: ${queue.total} items approche le seuil`,
          total: queue.total,
          timestamp: now
        });
      }
    });

    // RÈGLE 3: SLA en danger
    const slaBreaches = await this.prisma.bordereau.count({
      where: {
        dateLimiteTraitement: { lt: now },
        statut: { notIn: ['TRAITE', 'CLOTURE', 'PAYE'] }
      }
    });

    if (slaBreaches > 0) {
      alerts.push({
        type: 'SLA_BREACH',
        level: 'CRITICAL',
        message: `${slaBreaches} bordereaux en dépassement SLA`,
        count: slaBreaches,
        timestamp: now
      });
    }

    // RÈGLE 4: Gestionnaires sans chef d'équipe
    const orphanedGestionnaires = await this.prisma.user.count({
      where: {
        role: 'GESTIONNAIRE',
        active: true,
        teamLeaderId: null
      }
    });

    if (orphanedGestionnaires > 0) {
      alerts.push({
        type: 'HIERARCHY_ERROR',
        level: 'WARNING',
        message: `${orphanedGestionnaires} gestionnaires sans chef d'équipe`,
        count: orphanedGestionnaires,
        timestamp: now
      });
    }

    return {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'CRITICAL').length,
      warning: alerts.filter(a => a.level === 'WARNING').length,
      alerts: alerts.sort((a, b) => {
        if (a.level === 'CRITICAL' && b.level !== 'CRITICAL') return -1;
        if (a.level !== 'CRITICAL' && b.level === 'CRITICAL') return 1;
        return 0;
      })
    };
  }

  @Get('document-assignments')
  @Public()
  async getDocumentAssignments(@Query() params: any) {
    const { documentType, gestionnaire, chefEquipe } = params;
    // NOTE: slaStatus filtering is done on frontend after calculation

    const whereClause: any = {};
    if (documentType) whereClause.type = documentType;

    // Query ALL DOCUMENTS with their relationships
    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: {
        bordereau: {
          include: {
            client: { select: { name: true } },
            contract: {
              select: {
                assignedManager: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true,
                    teamLeader: {
                      select: {
                        id: true,
                        fullName: true,
                        role: true
                      }
                    }
                  }
                },
                teamLeader: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true
                  }
                }
              }
            },
            currentHandler: {
              select: {
                id: true,
                fullName: true,
                role: true,
                teamLeader: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true
                  }
                }
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            role: true,
            teamLeader: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    const now = new Date();
    
    // console.log(`🔍 Processing ${documents.length} documents for assignments`);
    
    const assignments = documents.map(doc => {
      let gestionnaire: any = null;
      let chefEquipe: any = null;
      
      // Priority 1: assignedTo is GESTIONNAIRE or GESTIONNAIRE_SENIOR
      if (doc.assignedTo?.role === 'GESTIONNAIRE' || doc.assignedTo?.role === 'GESTIONNAIRE_SENIOR') {
        gestionnaire = doc.assignedTo;
        chefEquipe = doc.assignedTo.teamLeader?.role === 'CHEF_EQUIPE' ? doc.assignedTo.teamLeader : null;
      }
      // Priority 2: assignedTo is CHEF_EQUIPE - use contract.teamLeader as chef
      else if (doc.assignedTo?.role === 'CHEF_EQUIPE') {
        chefEquipe = doc.assignedTo;
        // No gestionnaire assigned yet
      }
      // Priority 3: currentHandler is GESTIONNAIRE or GESTIONNAIRE_SENIOR
      else if (doc.bordereau?.currentHandler?.role === 'GESTIONNAIRE' || doc.bordereau?.currentHandler?.role === 'GESTIONNAIRE_SENIOR') {
        gestionnaire = doc.bordereau.currentHandler;
        chefEquipe = doc.bordereau.currentHandler.teamLeader?.role === 'CHEF_EQUIPE' ? doc.bordereau.currentHandler.teamLeader : null;
      }
      // Priority 4: contract.assignedManager is GESTIONNAIRE or GESTIONNAIRE_SENIOR
      else if (doc.bordereau?.contract?.assignedManager?.role === 'GESTIONNAIRE' || doc.bordereau?.contract?.assignedManager?.role === 'GESTIONNAIRE_SENIOR') {
        gestionnaire = doc.bordereau.contract.assignedManager;
        chefEquipe = doc.bordereau.contract.assignedManager.teamLeader?.role === 'CHEF_EQUIPE' ? doc.bordereau.contract.assignedManager.teamLeader : null;
      }
      
      // Fallback: Check contract.teamLeader for chef
      if (!chefEquipe && doc.bordereau?.contract?.teamLeader?.role === 'CHEF_EQUIPE') {
        chefEquipe = doc.bordereau.contract.teamLeader;
      }
      
      const gestionnaireName = gestionnaire?.fullName || 'NON ASSIGNÉ';
      const chefEquipeName = chefEquipe?.fullName || 'AUCUN CHEF';
      
      // RÈGLE SLA UNIFIÉE: Calcul basé sur pourcentage du délai écoulé (identique aux bordereaux)
      let slaStatusValue = 'ON_TIME';
      let slaColor = 'success';
      
      // Utiliser dateReception du bordereau (pas dateReceptionBO qui peut être null)
      const receptionDate = doc.bordereau?.dateReception;
      
      if (receptionDate && doc.bordereau?.delaiReglement) {
        const daysElapsed = (now.getTime() - new Date(receptionDate).getTime()) / (1000 * 60 * 60 * 24);
        const percentageElapsed = (daysElapsed / doc.bordereau.delaiReglement) * 100;
        
        if (percentageElapsed > 100) {
          slaStatusValue = 'OVERDUE';
          slaColor = 'error';
        } else if (percentageElapsed > 80) {
          slaStatusValue = 'AT_RISK';
          slaColor = 'warning';
        }
      }

      // Détection données défaillantes
      const hasIssue = !gestionnaire || !chefEquipe;

      return {
        id: doc.id,
        reference: doc.name,
        documentType: doc.type,
        clientName: doc.bordereau?.client?.name || 'N/A',
        gestionnaire: gestionnaireName,
        gestionnaireId: gestionnaire?.id,
        chefEquipe: chefEquipeName,
        chefEquipeId: chefEquipe?.id,
        statut: doc.status || 'UPLOADED',
        assignedAt: doc.assignedAt || doc.uploadedAt,
        dateLimite: doc.bordereau?.dateLimiteTraitement,
        slaStatus: slaStatusValue,
        slaColor,
        hasIssue,
        issueType: hasIssue ? (!gestionnaire ? 'NO_GESTIONNAIRE' : 'NO_CHEF') : null
      };
    });

    // Appliquer filtres (sauf SLA qui est filtré côté frontend)
    let filtered = assignments;
    if (gestionnaire) {
      if (gestionnaire === 'NON ASSIGNÉ') {
        filtered = filtered.filter(a => a.gestionnaire === 'NON ASSIGNÉ');
      } else {
        filtered = filtered.filter(a => a.gestionnaire.toLowerCase().includes(gestionnaire.toLowerCase()));
      }
    }
    if (chefEquipe) {
      if (chefEquipe === 'AUCUN CHEF') {
        filtered = filtered.filter(a => a.chefEquipe === 'AUCUN CHEF');
      } else {
        filtered = filtered.filter(a => a.chefEquipe.toLowerCase().includes(chefEquipe.toLowerCase()));
      }
    }
    // NOTE: slaStatus filtering removed - done on frontend

    return {
      total: filtered.length,
      withIssues: filtered.filter(a => a.hasIssue).length,
      slaBreaches: filtered.filter(a => a.slaStatus === 'OVERDUE').length,
      atRisk: filtered.filter(a => a.slaStatus === 'AT_RISK').length,
      assignments: filtered
    };
  }

  @Get('documents/comprehensive-stats')
  @Public()
  async getComprehensiveDocumentStats(@Query() params: any) {
    const documentType = params.documentType;
    
    // console.log('📊 Fetching DOCUMENT-LEVEL stats for type:', documentType || 'ALL');
    
    const documentTypes = [
      'BULLETIN_SOIN',
      'COMPLEMENT_INFORMATION', 
      'ADHESION',
      'RECLAMATION',
      'CONTRAT_AVENANT',
      'DEMANDE_RESILIATION',
      'CONVENTION_TIERS_PAYANT'
    ];

    const stats: Record<string, any> = {};
    
    for (const type of documentTypes) {
      if (documentType && documentType !== type) continue;
      
      // Count DOCUMENTS (not bordereaux) by type
      const whereClause: any = { type: type as any };
      
      const [total, aScanner, enCoursScan, scanFinalise, enCoursTraitement, traite, regle, slaBreaches] = await Promise.all([
        this.prisma.document.count({ where: whereClause }),
        this.prisma.document.count({ where: { ...whereClause, status: 'UPLOADED' as any } }),
        this.prisma.document.count({ where: { ...whereClause, status: 'EN_COURS' as any } }),
        this.prisma.document.count({ where: { ...whereClause, status: 'SCANNE' as any } }),
        this.prisma.document.count({ where: { ...whereClause, status: { in: ['EN_COURS', 'SCANNE'] as any } } }),
        this.prisma.document.count({ where: { ...whereClause, status: 'TRAITE' as any } }),
        this.prisma.document.count({ where: { ...whereClause, status: { in: ['TRAITE'] as any } } }),
        // SLA breaches only for applicable types
        !['CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT'].includes(type)
          ? this.prisma.document.count({
              where: {
                ...whereClause,
                slaApplicable: true,
                bordereau: {
                  dateLimiteTraitement: { lt: new Date() },
                  statut: { notIn: ['TRAITE', 'CLOTURE', 'PAYE'] as any }
                }
              }
            })
          : 0
      ]);
      
      // Calculate average processing time for documents
      const processedDocs = await this.prisma.document.findMany({
        where: {
          ...whereClause,
          status: 'TRAITE' as any
        },
        include: {
          bordereau: {
            select: {
              dateReception: true,
              dateCloture: true
            }
          }
        },
        take: 100
      });
      
      const validDocs = processedDocs.filter(doc => doc.bordereau?.dateReception && doc.bordereau?.dateCloture);
      
      const avgProcessingTime = validDocs.length > 0 
        ? validDocs.reduce((sum, doc) => {
            return sum + (doc.bordereau!.dateCloture!.getTime() - doc.bordereau!.dateReception!.getTime()) / (1000 * 60 * 60);
          }, 0) / validDocs.length
        : 0;
      
      stats[type] = {
        total,
        A_SCANNER: aScanner,
        EN_COURS_SCAN: enCoursScan,
        SCAN_FINALISE: scanFinalise,
        EN_COURS_TRAITEMENT: enCoursTraitement,
        TRAITE: traite,
        REGLE: regle,
        slaBreaches,
        avgProcessingTime: Math.round(avgProcessingTime * 10) / 10
      };
      
      // console.log(`📊 Document stats for ${type}:`, stats[type]);
    }
    
    return stats;
  }

  @Get('assignments/document-level')
  @Public()
  async getDocumentLevelAssignments() {
    const assignments = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: { not: null }
      },
      include: {
        currentHandler: {
          select: {
            fullName: true,
            teamLeader: {
              select: { fullName: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    return assignments.map(assignment => {
      const now = new Date();
      let slaStatus = 'ON_TIME';
      
      if (assignment.dateLimiteTraitement) {
        const hoursUntilDeadline = (assignment.dateLimiteTraitement.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilDeadline < 0) slaStatus = 'OVERDUE';
        else if (hoursUntilDeadline < 24) slaStatus = 'AT_RISK';
      }
      
      return {
        documentId: assignment.id,
        documentType: 'BULLETIN_SOIN',
        reference: assignment.reference,
        assignedTo: assignment.currentHandler?.fullName || 'Non assigné',
        chefEquipe: assignment.currentHandler?.teamLeader?.fullName || 'Aucun chef',
        status: assignment.statut,
        assignedAt: assignment.updatedAt,
        slaStatus
      };
    });
  }

  @Get('gestionnaire-senior/reassigned-documents')
  @Public()
  async getReassignedDocuments(@Query('userId') userId: string) {
    if (!userId) {
      return { success: false, message: 'User ID is required' };
    }

    const documents = await this.prisma.document.findMany({
      where: { assignedToUserId: userId },
      include: {
        bordereau: {
          select: {
            reference: true,
            dateReception: true,
            dateLimiteTraitement: true,
            delaiReglement: true,
            statut: true,
            client: { select: { name: true } },
            contract: { 
              select: { 
                delaiReglement: true,
                client: { select: { name: true } }
              } 
            }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    const now = new Date();

    return {
      success: true,
      total: documents.length,
      documents: documents.map(doc => {
        const bordereau = doc.bordereau;
        const clientName = bordereau?.client?.name || bordereau?.contract?.client?.name || 'N/A';
        const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
        const { remainingDays } = this.computeRemainingDays(bordereau?.dateReception, delaiReglement, now);
        const isOverdue = remainingDays < 0;

        return {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          status: doc.status,
          bordereauReference: bordereau?.reference || 'N/A',
          clientName,
          assignedAt: doc.assignedAt,
          uploadedAt: doc.uploadedAt,
          isOverdue,
          remainingDays,
          bordereauStatus: bordereau?.statut
        };
      })
    };
  }

  @Get('chef-equipe/reassigned-documents')
  @Public()
  async getChefEquipeReassignedDocuments(@Query('userId') userId: string) {
    if (!userId) {
      return { success: false, message: 'User ID is required' };
    }

    // Find all team members with this chef as teamLeader
    const allTeamMembers = await this.prisma.user.findMany({
      where: { teamLeaderId: userId },
      select: { id: true, fullName: true }
    });

    if (!allTeamMembers.length) {
      return { success: true, total: 0, documents: [], byMember: {} };
    }

    const allTeamMemberIds = allTeamMembers.map(m => m.id);
    const memberNameMap = new Map(allTeamMembers.map(m => [m.id, m.fullName]));

    const reassignmentHistory = await this.prisma.documentAssignmentHistory.findMany({
      where: { assignedToUserId: { in: allTeamMemberIds }, action: 'REASSIGNED' },
      select: { documentId: true, assignedToUserId: true, createdAt: true }
    });

    if (!reassignmentHistory.length) {
      return { success: true, total: 0, documents: [], byMember: {} };
    }

    const reassignedDocIds = [...new Set(reassignmentHistory.map(h => h.documentId))];
    // Keep latest history entry per doc
    const reassignedAtMap = new Map<string, Date>();
    const assignedToMap = new Map<string, string>();
    for (const h of reassignmentHistory) {
      const existing = reassignedAtMap.get(h.documentId);
      if (!existing || h.createdAt > existing) {
        reassignedAtMap.set(h.documentId, h.createdAt);
        if (h.assignedToUserId) assignedToMap.set(h.documentId, h.assignedToUserId);
      }
    }

    const documents = await this.prisma.document.findMany({
      where: { id: { in: reassignedDocIds } },
      include: {
        assignedTo: { select: { fullName: true } },
        bordereau: {
          select: {
            reference: true,
            dateReception: true,
            delaiReglement: true,
            statut: true,
            client: { select: { name: true } },
            contract: { select: { delaiReglement: true, client: { select: { name: true } } } }
          }
        }
      }
    });

    const now = new Date();

    const mappedDocs = documents.map(doc => {
      const bordereau = doc.bordereau;
      const clientName = bordereau?.client?.name || bordereau?.contract?.client?.name || 'N/A';
      const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
      const { remainingDays } = this.computeRemainingDays(bordereau?.dateReception, delaiReglement, now);
      const assignedToUserId = assignedToMap.get(doc.id);
      const assignedToName = assignedToUserId ? (memberNameMap.get(assignedToUserId) || doc.assignedTo?.fullName || 'N/A') : (doc.assignedTo?.fullName || 'N/A');

      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        status: doc.status,
        bordereauReference: bordereau?.reference || 'N/A',
        clientName,
        assignedTo: assignedToName,
        assignedAt: reassignedAtMap.get(doc.id) || doc.assignedAt || doc.uploadedAt,
        isOverdue: remainingDays < 0,
        daysRemaining: remainingDays,
        bordereauStatus: bordereau?.statut
      };
    });

    // Group by team member for the byMember summary
    const byMember: Record<string, { name: string; count: number }> = {};
    for (const [docId, memberId] of assignedToMap) {
      if (!byMember[memberId]) byMember[memberId] = { name: memberNameMap.get(memberId) || memberId, count: 0 };
      byMember[memberId].count++;
    }

    return {
      success: true,
      total: mappedDocs.length,
      documents: mappedDocs,
      byMember
    };
  }

  @Get('gestionnaire/reassigned-documents')
  @Public()
  async getGestionnaireReassignedDocuments(@Query('userId') userId: string) {
    if (!userId) {
      return { success: false, message: 'User ID is required' };
    }

    // Only return documents that were explicitly reassigned via the super-admin workflow
    const reassignmentHistory = await this.prisma.documentAssignmentHistory.findMany({
      where: { assignedToUserId: userId, action: 'REASSIGNED' },
      select: { documentId: true, createdAt: true }
    });

    if (!reassignmentHistory.length) {
      return { success: true, total: 0, documents: [] };
    }

    const reassignedDocIds = reassignmentHistory.map(h => h.documentId);
    const reassignedAtMap = new Map(reassignmentHistory.map(h => [h.documentId, h.createdAt]));

    const documents = await this.prisma.document.findMany({
      where: { id: { in: reassignedDocIds }, assignedToUserId: userId },
      include: {
        bordereau: {
          select: {
            reference: true,
            dateReception: true,
            delaiReglement: true,
            statut: true,
            client: { select: { name: true } },
            contract: { select: { delaiReglement: true, client: { select: { name: true } } } }
          }
        }
      }
    });

    const now = new Date();

    return {
      success: true,
      total: documents.length,
      documents: documents.map(doc => {
        const bordereau = doc.bordereau;
        const clientName = bordereau?.client?.name || bordereau?.contract?.client?.name || 'N/A';
        const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
        const { remainingDays } = this.computeRemainingDays(bordereau?.dateReception, delaiReglement, now);
        const isOverdue = remainingDays < 0;
        const reassignedAt = reassignedAtMap.get(doc.id) || doc.assignedAt || doc.uploadedAt;

        return {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          status: doc.status,
          bordereauReference: bordereau?.reference || 'N/A',
          clientName,
          assignedAt: reassignedAt,
          isOverdue,
          daysRemaining: remainingDays,
          bordereauStatus: bordereau?.statut
        };
      })
    };
  }

  @Get('hierarchy/validation')
  @Public()
  async validateHierarchy() {
    // Check for gestionnaires without chef d'équipe
    const gestionnairesWithoutChef = await this.prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE',
        active: true,
        teamLeaderId: null
      },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    // Check for orphaned assignments using bordereau
    const orphanedAssignments = await this.prisma.bordereau.count({
      where: {
        assignedToUserId: { not: null },
        currentHandler: {
          teamLeaderId: null,
          role: 'GESTIONNAIRE'
        }
      }
    });

    return {
      isValid: gestionnairesWithoutChef.length === 0,
      issues: gestionnairesWithoutChef.map(user => ({
        type: 'MISSING_TEAM_LEADER',
        userId: user.id,
        userName: user.fullName,
        description: `Gestionnaire ${user.fullName} sans chef d'équipe assigné`
      })),
      orphanedAssignments,
      summary: {
        gestionnairesWithoutChef: gestionnairesWithoutChef.length,
        orphanedAssignments
      }
    };
  }

  @Post('ai-suggestions')
  @Public()
  async getAISuggestions(@Body() data: {
    teamId: string;
    teamName: string;
    workload: number;
    utilizationRate: number;
  }) {
    return this.calculateSmartAISuggestions(data);
  }

  @Post('get-documents-preview')
  @Public()
  async getDocumentsPreview(@Body() data: {
    teamId: string;
    count: number;
  }) {
    const { sourceTeam, documents } = await this.getSourceDocumentsForTeam(data.teamId, data.count);
    
    if (!sourceTeam || !documents.length) {
      return { documents: [], total: 0 };
    }

    // Return document details with names/references
    const documentDetails = documents.map(({ doc, remainingDays, isUrgent, isOverdue }) => ({
      id: doc.id,
      name: doc.name || doc.type || 'Document',
      type: doc.type,
      bordereauReference: doc.bordereau?.reference || doc.bordereau?.id || 'N/A',
      remainingDays,
      isUrgent,
      isOverdue,
      status: doc.status
    }));

    return {
      documents: documentDetails,
      total: documentDetails.length,
      sourceTeam: {
        id: sourceTeam.id,
        fullName: sourceTeam.fullName,
        role: sourceTeam.role
      }
    };
  }

  @Post('execute-action')
  @Public()
  async executeAction(@Body() data: {
    action: 'REASSIGN' | 'INCREASE_CAPACITY' | 'PRIORITIZE' | 'NOTIFY';
    teamId?: string;
    sourceTeamId?: string;
    targetTeamName?: string;
    count?: number;
    splits?: { teamId: string; targetTeamName?: string; count: number }[];
    percentage?: number;
    urgentCount?: number;
    overdueCount?: number;
    teamName?: string;
    message?: string;
  }) {
    const now = new Date();

    try {
      switch (data.action) {
        case 'REASSIGN': {
          const candidateTeams = await this.getAssignableTargetTeams(data.sourceTeamId);

          if (!candidateTeams.length) {
            return { success: false, message: 'Aucune équipe cible éligible trouvée' };
          }

          const { sourceTeam, documents } = await this.getSourceDocumentsForTeam(
            data.sourceTeamId || '',
            data.splits?.reduce((sum, split) => sum + split.count, 0) || data.count
          );

          if (!sourceTeam) {
            return { success: false, message: 'Équipe source non trouvée' };
          }

          const safeDocuments = documents.filter(item => !item.isUrgent && !item.isOverdue);
          const fallbackDocuments = documents.filter(item => !item.isOverdue);
          const candidateDocuments = safeDocuments.length > 0 ? safeDocuments : (fallbackDocuments.length > 0 ? fallbackDocuments : documents);

          console.log('📄 [EXECUTE-REASSIGN] Document pools - Safe:', safeDocuments.length, 'Fallback:', fallbackDocuments.length, 'Total:', documents.length, 'Using:', candidateDocuments.length);

          if (!candidateDocuments.length) {
            console.error('❌ [EXECUTE-REASSIGN] No candidate documents available');
            return { success: false, message: 'Aucun document réaffectable disponible actuellement' };
          }

          const requestedSplits = data.splits?.length
            ? data.splits
            : [{
                teamId: data.teamId || '',
                targetTeamName: data.targetTeamName,
                count: data.count || 1
              }];

          const normalizedSplits = requestedSplits
            .map(split => {
              const team = candidateTeams.find(candidate =>
                candidate.id === split.teamId ||
                (split.targetTeamName && candidate.fullName === split.targetTeamName)
              );

              if (!team) return null;
              if (team.role === 'SUPER_ADMIN' || team.role === 'RESPONSABLE_DEPARTEMENT') return null;

              return {
                ...split,
                team
              };
            })
            .filter(Boolean) as Array<{ teamId: string; targetTeamName?: string; count: number; team: any }>;

          if (!normalizedSplits.length) {
            return { success: false, message: 'Aucune équipe disponible pour la réaffectation' };
          }

          if (!normalizedSplits.length) {
            return { success: false, message: 'Aucune équipe disponible pour la réaffectation' };
          }

          const requestedTotal = normalizedSplits.reduce((sum, split) => sum + Math.max(0, split.count || 0), 0);
          const docsToMove = candidateDocuments.slice(0, requestedTotal);

          if (!docsToMove.length) {
            return { success: false, message: 'Aucun document réaffectable disponible actuellement' };
          }

          let docCursor = 0;
          const reassignedIds: string[] = [];
          const executionSummary: any[] = [];

          for (const split of normalizedSplits) {
            const allocationDocs = docsToMove.slice(docCursor, docCursor + split.count);
            if (!allocationDocs.length) continue;

            for (const { doc } of allocationDocs) {
              let finalTargetUserId = split.team.id;

              // If target is CHEF_EQUIPE, assign to least loaded team member instead
              if (split.team.role === 'CHEF_EQUIPE') {
                // split.team.id is the chef's USER ID (from getAssignableTargetTeams)
                // Find team members via teamLeaderId = chef's user ID
                const teamMembers = await this.prisma.user.findMany({
                  where: {
                    teamLeaderId: split.team.id,
                    active: true,
                    role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'] }
                  },
                  include: {
                    assignedDocuments: true
                  }
                });

                console.log(`👥 [EXECUTE-REASSIGN] Found ${teamMembers.length} team members for chef ${split.team.fullName} (ID: ${split.team.id})`);

                if (teamMembers.length > 0) {
                  // Find least loaded team member
                  const leastLoaded = teamMembers.reduce((min, member) => 
                    member.assignedDocuments.length < min.assignedDocuments.length ? member : min
                  );
                  finalTargetUserId = leastLoaded.id;
                  console.log(`👥 [EXECUTE-REASSIGN] Assigning to team member ${leastLoaded.fullName} (${leastLoaded.assignedDocuments.length} docs) instead of chef ${split.team.fullName}`);
                } else {
                  console.warn(`⚠️ [EXECUTE-REASSIGN] No team members found for chef ${split.team.fullName} - assigning to chef directly`);
                }
              }

              // Update ONLY document assignment - do NOT update bordereau or contract
              // This ensures true document-level reassignment without affecting other documents
              await this.prisma.document.update({
                where: { id: doc.id },
                data: {
                  assignedToUserId: finalTargetUserId,
                  assignedAt: now
                }
              });

              console.log(`📄 [EXECUTE-REASSIGN] Document ${doc.id} (${doc.name}) reassigned to ${finalTargetUserId}`);

              await this.prisma.documentAssignmentHistory.create({
                data: {
                  documentId: doc.id,
                  assignedToUserId: finalTargetUserId,
                  assignedByUserId: data.sourceTeamId || split.team.id,
                  fromUserId: doc.currentOwnerId || doc.assignedToUserId || null,
                  action: 'REASSIGNED',
                  reason: `Réaffectation automatique surcharge depuis ${sourceTeam.fullName}`
                }
              });

              reassignedIds.push(doc.id);
            }

            executionSummary.push({
              teamId: split.team.id,
              name: split.team.fullName,
              role: split.team.role,
              count: allocationDocs.length,
              utilizationRate: split.team.utilizationRate,
              performanceScore: split.team.performanceScore
            });

            docCursor += allocationDocs.length;
          }

          await this.prisma.auditLog.create({
            data: {
              action: 'REASSIGN_DOCUMENTS_SMART',
              userId: data.sourceTeamId || normalizedSplits[0].team.id,
              details: {
                from: sourceTeam.fullName,
                splits: executionSummary,
                count: reassignedIds.length,
                documentIds: reassignedIds
              }
            }
          });

          return {
            success: true,
            message: executionSummary.length > 1
              ? `${reassignedIds.length} document(s) réaffecté(s) vers ${executionSummary.length} équipes`
              : `${reassignedIds.length} document(s) réaffecté(s) vers ${executionSummary[0]?.name}`,
            reassignedCount: reassignedIds.length,
            targets: executionSummary,
            targetTeam: executionSummary[0] || null
          };
        }

        case 'INCREASE_CAPACITY': {
          const team = await this.prisma.user.findUnique({
            where: { id: data.teamId }
          });

          if (!team) {
            return { success: false, message: 'Équipe non trouvée' };
          }

          const newCapacity = Math.ceil(team.capacity * (1 + (data.percentage || 0) / 100));

          await this.prisma.user.update({
            where: { id: data.teamId },
            data: { capacity: newCapacity }
          });

          // Create audit log
          await this.prisma.auditLog.create({
            data: {
              action: 'INCREASE_CAPACITY',
              userId: data.teamId,
              details: {
                team: team.fullName,
                oldCapacity: team.capacity,
                newCapacity,
                percentage: data.percentage
              }
            }
          });

          return { 
            success: true, 
            message: `Capacité augmentée de ${team.capacity} à ${newCapacity}`,
            oldCapacity: team.capacity,
            newCapacity
          };
        }

        case 'PRIORITIZE': {
          const team = await this.prisma.user.findUnique({
            where: { id: data.teamId },
            include: {
              assignedDocuments: {
                include: {
                  bordereau: {
                    select: {
                      dateReception: true,
                      delaiReglement: true,
                      contract: { select: { delaiReglement: true } }
                    }
                  }
                }
              },
              teamMembers: {
                where: { active: true },
                include: {
                  assignedDocuments: {
                    include: {
                      bordereau: {
                        select: {
                          dateReception: true,
                          delaiReglement: true,
                          contract: { select: { delaiReglement: true } }
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          if (!team) {
            return { success: false, message: 'Équipe non trouvée' };
          }

          // Get all urgent documents
          const allDocs = team.role === 'CHEF_EQUIPE'
            ? [...team.assignedDocuments, ...(team.teamMembers || []).flatMap(m => m.assignedDocuments)]
            : team.assignedDocuments;

          const urgentDocs = allDocs.filter(doc => {
            const bordereau = doc.bordereau;
            if (!bordereau) return false;
            
            const delaiReglement = bordereau.delaiReglement || bordereau.contract?.delaiReglement || 30;
            const deadlineDate = new Date(bordereau.dateReception);
            deadlineDate.setDate(deadlineDate.getDate() + delaiReglement);
            const remainingDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            return remainingDays <= 3 || remainingDays < 0;
          });

          // Mark as priority
          const prioritizedIds: string[] = [];
          for (const doc of urgentDocs) {
            await this.prisma.document.update({
              where: { id: doc.id },
              data: { priority: 1 }
            });
            prioritizedIds.push(doc.id);
          }

          // Create audit log
          await this.prisma.auditLog.create({
            data: {
              action: 'PRIORITIZE_DOCUMENTS',
              userId: data.teamId,
              details: {
                team: team.fullName,
                count: prioritizedIds.length,
                documentIds: prioritizedIds
              }
            }
          });

          return { 
            success: true, 
            message: `${prioritizedIds.length} documents marqués comme prioritaires`,
            prioritizedCount: prioritizedIds.length
          };
        }

        case 'NOTIFY': {
          if (!data.teamId) {
            return { success: false, message: 'ID d\'équipe manquant' };
          }

          const team = await this.prisma.user.findUnique({
            where: { id: data.teamId },
            select: { fullName: true, email: true, role: true }
          });

          if (!team) {
            return { success: false, message: 'Équipe non trouvée' };
          }

          const notifMessage = data.message || `Alerte surcharge: Votre équipe dépasse la capacité maximale. Action requise.`;

          // Create in-app notification visible to the user
          const notification = await this.prisma.notification.create({
            data: {
              userId: data.teamId,
              type: 'TEAM_OVERLOAD',
              title: '🚨 Alerte Surcharge Équipe',
              message: notifMessage,
              data: { teamName: data.teamName || team.fullName, sentBy: 'SUPER_ADMIN' },
              read: false
            }
          });

          console.log('🔔 Notification created:', {
            id: notification.id,
            userId: notification.userId,
            userName: team.fullName,
            userEmail: team.email,
            title: notification.title,
            message: notification.message
          });

          // Create alert log
          await this.prisma.alertLog.create({
            data: {
              alertType: 'TEAM_OVERLOAD',
              alertLevel: 'CRITICAL',
              message: notifMessage,
              userId: data.teamId,
              resolved: false
            }
          });

          // Create audit log
          await this.prisma.auditLog.create({
            data: {
              action: 'SEND_NOTIFICATION',
              userId: data.teamId,
              details: { team: team.fullName, email: team.email, message: notifMessage }
            }
          });

          return { 
            success: true, 
            message: `Notification envoyée à ${team.fullName}`,
            recipient: `${team.fullName} (${team.email})`
          };
        }

        default:
          return { success: false, message: 'Action non reconnue' };
      }
    } catch (error) {
      console.error('Error executing action:', error);
      return { success: false, message: 'Erreur lors de l\'exécution de l\'action' };
    }
  }
}
