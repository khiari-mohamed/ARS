/**
 * Returns SLA color code based on average SLA and reglement delay.
 * - Green: avgSLA <= reglementDelay
 * - Orange: avgSLA <= reglementDelay + 2
 * - Red: avgSLA > reglementDelay + 2
 */
export function getSLAColor(avgSLA: number, reglementDelay: number): 'green' | 'orange' | 'red' {
  if (avgSLA === undefined || reglementDelay === undefined) return 'green';
  if (avgSLA <= reglementDelay) return 'green';
  if (avgSLA <= reglementDelay + 2) return 'orange';
  return 'red';
}