# Verification script for orphaned files
# Checks if files are truly unused before deletion

$orphanedFiles = @(
    "src/alerts/dto/create-alert.dto.ts",
    "src/alerts/dto/update-alert.dto.ts",
    "src/analytics/predictive-analytics.service.ts",
    "src/auth/auth.utils.ts",
    "src/bordereaux/dto/statut.enum.ts",
    "src/bordereaux/escalation.service.ts",
    "src/bordereaux/role-based-filter.service.ts",
    "src/bordereaux/workflow-status.enum.ts",
    "src/bulletin-soin/entities/bs-log.entity.ts",
    "src/bulletin-soin/entities/bulletin-soin-item.entity.ts",
    "src/finance/automated-reconciliation.service.ts",
    "src/finance/finance-api.controller.ts",
    "src/finance/financial-reporting.service.ts",
    "src/finance/multi-bank-format.service.ts",
    "src/gec/dto/create-template.dto.ts",
    "src/gec/template-management.service.ts",
    "src/ged/dto/create-connector.dto.ts",
    "src/ged/dto/create-webhook.dto.ts",
    "src/ged/integration-apis.service.ts",
    "src/jobs/sync-tuniclaim.job.ts",
    "src/reclamations/ai-integration-complete.ts",
    "src/reclamations/generate-insights-method.ts",
    "src/test-stats.controller.ts",
    "src/utils/error.utils.ts",
    "src/workflow/dto/workflow-status.dto.ts",
    "src/workflow/interfaces/assignment.interface.ts",
    "src/workflow/workflow-integration.module.ts",
    "src/workflow/workflow.scheduler.ts",
    "src/bordereaux/super-admin.controller.ts",
    "src/bordereaux/workflow-engine.service.ts"
)

$results = @()

foreach ($file in $orphanedFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "File not found: $file" -ForegroundColor Red
        continue
    }
    
    $fileName = Split-Path $file -Leaf
    $baseName = $fileName -replace '\.(ts|tsx)$', ''
    $className = $baseName -replace '-', '' -replace '\.', ''
    
    Write-Host ""
    Write-Host "Checking: $file" -ForegroundColor Cyan
    
    # Check 1: Direct imports
    $importRefs = Select-String -Path "src/**/*.ts" -Pattern "from ['\`"].*$baseName" -SimpleMatch -ErrorAction SilentlyContinue
    
    # Check 2: Class name references
    $classRefs = Select-String -Path "src/**/*.ts" -Pattern $className -SimpleMatch -ErrorAction SilentlyContinue | 
                 Where-Object { $_.Path -notlike "*$file*" }
    
    # Check 3: Module registration
    $moduleRefs = Select-String -Path "src/**/*.module.ts" -Pattern $className -SimpleMatch -ErrorAction SilentlyContinue
    
    # Check 4: Controller registration
    $controllerRefs = Select-String -Path "src/**/*.module.ts" -Pattern $baseName -SimpleMatch -ErrorAction SilentlyContinue
    
    $totalRefs = ($importRefs | Measure-Object).Count + 
                 ($classRefs | Measure-Object).Count + 
                 ($moduleRefs | Measure-Object).Count + 
                 ($controllerRefs | Measure-Object).Count
    
    if ($totalRefs -eq 0) {
        Write-Host "  SAFE TO DELETE" -ForegroundColor Green
    } else {
        Write-Host "  USED ($totalRefs refs)" -ForegroundColor Yellow
    }
    
    if ($totalRefs -gt 0) {
        Write-Host "  References found:" -ForegroundColor Yellow
        if ($importRefs) {
            Write-Host "    - Import refs: $($importRefs.Count)" -ForegroundColor Yellow
            $importRefs | Select-Object -First 3 | ForEach-Object { 
                Write-Host "      $($_.Path):$($_.LineNumber)" -ForegroundColor Gray 
            }
        }
        if ($classRefs) {
            Write-Host "    - Class refs: $($classRefs.Count)" -ForegroundColor Yellow
            $classRefs | Select-Object -First 3 | ForEach-Object { 
                Write-Host "      $($_.Path):$($_.LineNumber)" -ForegroundColor Gray 
            }
        }
        if ($moduleRefs) {
            Write-Host "    - Module refs: $($moduleRefs.Count)" -ForegroundColor Yellow
            $moduleRefs | ForEach-Object { 
                Write-Host "      $($_.Path):$($_.LineNumber)" -ForegroundColor Gray 
            }
        }
    }
    
    $results += [PSCustomObject]@{
        File = $file
        Status = if ($totalRefs -eq 0) { "SAFE" } else { "USED" }
        References = $totalRefs
    }
}

Write-Host ""
Write-Host ""
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================================"

$safeToDelete = $results | Where-Object { $_.Status -eq "SAFE" }
$inUse = $results | Where-Object { $_.Status -eq "USED" }

Write-Host ""
Write-Host "SAFE TO DELETE ($($safeToDelete.Count) files):" -ForegroundColor Green
$safeToDelete | ForEach-Object { Write-Host "  - $($_.File)" -ForegroundColor Green }

Write-Host ""
Write-Host "STILL IN USE ($($inUse.Count) files):" -ForegroundColor Yellow
$inUse | ForEach-Object { Write-Host "  - $($_.File) ($($_.References) refs)" -ForegroundColor Yellow }

# Generate deletion script
$deleteScript = "# Auto-generated deletion script`n"
$deleteScript += "# Run this after verifying the results`n`n"
$safeToDelete | ForEach-Object {
    $deleteScript += "Remove-Item '$($_.File)' -Force`n"
}

$deleteScript | Out-File "delete-orphans.ps1" -Encoding UTF8
Write-Host ""
Write-Host "Deletion script saved to: delete-orphans.ps1" -ForegroundColor Cyan
Write-Host "Review the results above, then run: .\delete-orphans.ps1" -ForegroundColor Cyan
