# Fix all backend timeouts to 5 minutes (300000ms)

$files = @(
    "d:\ARS\server\src\alerts\alerts.service.ts",
    "d:\ARS\server\src\analytics\analytics.service.ts",
    "d:\ARS\server\src\dashboard\dashboard.service.ts",
    "d:\ARS\server\src\bordereaux\bordereaux.service.ts",
    "d:\ARS\server\src\ai-enhancements\ai-enhancements.service.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Replace all timeout values
        $content = $content -replace 'timeout:\s*3000\b', 'timeout: 300000'
        $content = $content -replace 'timeout:\s*5000\b', 'timeout: 300000'
        $content = $content -replace 'timeout:\s*8000\b', 'timeout: 300000'
        $content = $content -replace 'timeout:\s*10000\b', 'timeout: 300000'
        $content = $content -replace 'timeout:\s*15000\b', 'timeout: 300000'
        $content = $content -replace 'timeout:\s*30000\b', 'timeout: 300000'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "✅ Fixed: $file" -ForegroundColor Green
    }
}

Write-Host "`n✅ All backend timeouts increased to 5 minutes!" -ForegroundColor Green
