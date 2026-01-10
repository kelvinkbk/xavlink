# Quick script to set up DATABASE_URL
# Usage: .\fix-env.ps1

Write-Host "=== Database URL Setup ===" -ForegroundColor Cyan
Write-Host "`nEnter your PostgreSQL details:" -ForegroundColor Yellow

$username = Read-Host "Username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($username)) { $username = "postgres" }

$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

$database = Read-Host "Database name (default: xavlink)"
if ([string]::IsNullOrWhiteSpace($database)) { $database = "xavlink" }

$dbUrl = "postgresql://${username}:${passwordPlain}@localhost:5432/${database}"

Write-Host "`nCreating .env file..." -ForegroundColor Cyan
"DATABASE_URL=`"$dbUrl`"" | Set-Content .env

Write-Host "✅ .env file created!" -ForegroundColor Green
Write-Host "`nNow you can run: npx prisma migrate dev" -ForegroundColor Cyan
