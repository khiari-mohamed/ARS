#!/usr/bin/env bash
# diagnose.sh — one-shot audit of scheduler duplication, AI call sites,
# env var mismatches, and dashboard initial-load fan-out.
# Run from D:\ARS\server (or wherever your Nest app root is).

OUT="diagnosis-report.txt"
> "$OUT"

section() {
  echo "" >> "$OUT"
  echo "================================================================" >> "$OUT"
  echo "  $1" >> "$OUT"
  echo "================================================================" >> "$OUT"
}

section "1. ALL @Cron / @Interval DECLARATIONS (file + line)"
grep -rn "@Cron\|@Interval" src/ --include="*.ts" | grep -v ".spec.ts" >> "$OUT"

section "2. EVERY MODULE THAT PROVIDES EACH SCHEDULER-BEARING SERVICE"
echo "-- collecting service class names found in step 1 --" >> "$OUT"
SCHEDULER_FILES=$(grep -rl "@Cron\|@Interval" src/ --include="*.ts" | grep -v ".spec.ts")
for f in $SCHEDULER_FILES; do
  CLASS=$(grep -oP "(?<=export class )\w+" "$f" | head -1)
  if [ -n "$CLASS" ]; then
    echo "" >> "$OUT"
    echo "Service: $CLASS  (defined in $f)" >> "$OUT"
    echo "  --> declared as a provider in:" >> "$OUT"
    grep -rl "\b$CLASS\b" src/ --include="*.module.ts" | sed 's/^/      /' >> "$OUT"
  fi
done

section "3. ALL DIRECT AI MICROSERVICE CALLERS (files referencing AI_MICROSERVICE_URL / AI_SERVICE_URL)"
grep -rl "AI_MICROSERVICE_URL\|AI_SERVICE_URL" src/ --include="*.ts" | grep -v ".spec.ts" >> "$OUT"

section "4. ALL AI ENV VAR NAMES ACTUALLY REFERENCED IN CODE (catch naming mismatches)"
grep -rohP "process\.env\.AI_\w+" src/ --include="*.ts" | grep -v ".spec.ts" | sort -u >> "$OUT"

section "5. WHAT'S ACTUALLY DEFINED IN .env (AI_* only — values redacted)"
if [ -f .env ]; then
  grep -i "^AI_" .env | sed -E 's/=(.+)/=<redacted>/' >> "$OUT"
else
  echo ".env not found in current directory — run this script from the server root" >> "$OUT"
fi

section "6. DASHBOARD CONTROLLER — role-based endpoint definition"
grep -rn "role-based" src/dashboard/*.controller.ts >> "$OUT" 2>/dev/null

section "7. ALL @Cron/@Interval SCHEDULES GROUPED (to spot overlapping responsibilities by name)"
grep -rn "@Cron\|@Interval" src/ --include="*.ts" | grep -v ".spec.ts" | grep -iE "overload|sla|reclamation|alert|workflow" >> "$OUT"

section "8. FILES DECLARING MORE THAN ONE @Injectable CLASS (can hide duplicate providers)"
for f in $(grep -rl "@Injectable" src/ --include="*.ts" | grep -v ".spec.ts"); do
  COUNT=$(grep -c "@Injectable" "$f")
  if [ "$COUNT" -gt 1 ]; then
    echo "$f has $COUNT @Injectable classes" >> "$OUT"
  fi
done

section "9. RUNNING NODE PROCESSES (paste this section's output manually if on native PowerShell)"
echo "Run separately in PowerShell: Get-Process node | Select-Object Id, StartTime, CPU, WS" >> "$OUT"

echo ""
echo "Done. Report written to $OUT"
echo "Paste the full contents of $OUT back to me."