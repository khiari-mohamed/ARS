# find-colonne-source.ps1
$out = "D:\ARS\server\colonne-investigation.txt"
$results = @()

function Section($title, $cmd) {
    $script:results += "`n=====  $title  ====="
    $script:results += (Invoke-Expression $cmd | Out-String)
}

cd D:\ARS\server

Section "Prisma middleware (\$use)"        'findstr /s /i /n /c:"$use(" src\*.ts'
Section "Prisma extensions (\$extends)"    'findstr /s /i /n /c:"$extends(" src\*.ts'
Section "Prototype patching"               'findstr /s /i /n /c:"PrismaClient.prototype" src\*.ts'
Section "orderBy in bootstrap files"       'findstr /s /i /n /c:"orderBy" src\main.ts src\app.module.ts'
Section "Second PrismaClient instantiations" 'findstr /s /i /n /c:"new PrismaClient(" src\*.ts'
Section "Anything referencing colonne (full repo)" 'Get-ChildItem -Path D:\ARS -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "\\node_modules\\|\\.git\\|\\dist\\|\\build\\" } | Select-String -Pattern "colonne" -SimpleMatch'
Section "PrismaService in app.module.ts"   'findstr /s /i /n /c:"PrismaService" src\app.module.ts'
Section "main.ts full contents"            'Get-Content src\main.ts'
Section "app.module.ts full contents"      'Get-Content src\app.module.ts'

$results | Set-Content -Path $out -Encoding utf8
Write-Host "Done. Results in $out"
Get-Content $out