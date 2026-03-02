/**
 * Returns SLA color code based on percentage of delay elapsed.
 * - Green: percentageElapsed <= 80%
 * - Orange: percentageElapsed > 80% && <= 100%
 * - Red: percentageElapsed > 100%
 */
export function getSLAColor(daysElapsed: number, reglementDelay: number): 'green' | 'orange' | 'red' {
  if (daysElapsed === undefined || reglementDelay === undefined || reglementDelay === 0) return 'green';
  
  const percentageElapsed = (daysElapsed / reglementDelay) * 100;
  
  if (percentageElapsed > 100) return 'red';
  if (percentageElapsed > 80) return 'orange';
  return 'green';
}