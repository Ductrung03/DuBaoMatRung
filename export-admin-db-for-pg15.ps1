# ===== EXPORT ADMIN_DB FROM POSTGRES 17 COMPATIBLE WITH POSTGRES 15 =====

param(
    [string]$OutputFile = "docker-init\admin-postgis\01-admin-db.sql",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5433,
    [string]$DbUser = "postgres",
    [string]$DbName = "admin_db",
    [string]$DbPassword = "4"
)

Write-Host "=== EXPORT ADMIN_DB (COMPATIBLE WITH POSTGRES 15) ===" -ForegroundColor Cyan
Write-Host "Script nay se tao file SQL tuan thu voi Postgres 15" -ForegroundColor Yellow

# Kiem tra pg_dump co san
Write-Host "`n[1] Kiem tra pg_dump..." -ForegroundColor Yellow
try {
    $pgDumpVersion = pg_dump --version 2>&1
    Write-Host "  [OK] $pgDumpVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Khong tim thay pg_dump. Hay cai dat PostgreSQL client tools!" -ForegroundColor Red
    Write-Host "  Download tai: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

# Kiem tra ket noi database
Write-Host "`n[2] Kiem tra ket noi database..." -ForegroundColor Yellow
$env:PGPASSWORD = $DbPassword

try {
    $dbVersion = psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c "SELECT version();" 2>&1
    if ($dbVersion -match "PostgreSQL") {
        Write-Host "  [OK] Ket noi thanh cong!" -ForegroundColor Green
        Write-Host "  - $($dbVersion.Trim())" -ForegroundColor Cyan
    } else {
        throw "Khong the ket noi database"
    }
} catch {
    Write-Host "  [ERROR] Loi ket noi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Kiem tra lai:" -ForegroundColor Yellow
    Write-Host "    - Host: $DbHost" -ForegroundColor Cyan
    Write-Host "    - Port: $DbPort" -ForegroundColor Cyan
    Write-Host "    - User: $DbUser" -ForegroundColor Cyan
    Write-Host "    - Database: $DbName" -ForegroundColor Cyan
    exit 1
}

# Tao thu muc output
Write-Host "`n[3] Tao thu muc output..." -ForegroundColor Yellow
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "  [OK] Tao thu muc: $outputDir" -ForegroundColor Green
} else {
    Write-Host "  [OK] Thu muc da ton tai: $outputDir" -ForegroundColor Green
}

# Export database voi cac tuy chon tuan thu Postgres 15
Write-Host "`n[4] Export database (co the mat 5-10 phut)..." -ForegroundColor Yellow
Write-Host "  [WAIT] Dang xu ly..." -ForegroundColor Cyan

try {
    # Tao temp file de xu ly
    $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.sql'

    # Export voi cac options phu hop
    $pgDumpArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "--format=plain",              # Plain text SQL
        "--encoding=UTF8",             # UTF-8 encoding
        "--no-owner",                  # Khong bao gom owner statements
        "--no-acl",                    # Khong bao gom access privileges
        "--clean",                     # Them DROP statements
        "--if-exists",                 # Dung IF EXISTS voi DROP
        "--create",                    # Them CREATE DATABASE
        "--inserts",                   # Dung INSERT thay vi COPY (cham hon nhung an toan hon)
        "--column-inserts",            # Bao gom ten cot trong INSERT
        "--disable-dollar-quoting",    # Khong dung dollar quoting
        "--no-tablespaces",            # Khong bao gom tablespace assignments
        "--no-comments",               # Khong bao gom comments
        "-f", $tempFile
    )

    Write-Host "  [PROCESS] Dang chay pg_dump..." -ForegroundColor Cyan
    & pg_dump @pgDumpArgs 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    Write-Host "  [OK] Export thanh cong!" -ForegroundColor Green
    $tempFileInfo = Get-Item $tempFile
    Write-Host "  - Kich thuoc: $([math]::Round($tempFileInfo.Length/1MB, 2)) MB" -ForegroundColor Cyan

    # Xu ly file de tuan thu hon voi Postgres 15
    Write-Host "`n[5] Xu ly compatibility Postgres 15..." -ForegroundColor Yellow

    $sqlContent = Get-Content -Path $tempFile -Encoding UTF8 -Raw

    # Fix 1: Loai bo cac SET statements khong can thiet hoac khong ho tro
    Write-Host "  [PROCESS] Loai bo SET statements khong can thiet..." -ForegroundColor Cyan
    $sqlContent = $sqlContent -replace "(?m)^SET search_path.*$", ""
    $sqlContent = $sqlContent -replace "(?m)^SET default_table_access_method.*$", ""
    $sqlContent = $sqlContent -replace "(?m)^SET xmloption.*$", ""
    $sqlContent = $sqlContent -replace "(?m)^SET row_security.*$", ""
    $sqlContent = $sqlContent -replace "(?m)^SET default_tablespace.*$", ""

    # Fix 2: Them lai cac SET statement can thiet
    Write-Host "  [PROCESS] Them cac SET statement can thiet..." -ForegroundColor Cyan
    $header = @"
-- PostgreSQL database dump (Compatible with PostgreSQL 15)
-- Exported from: $DbHost:$DbPort/$DbName
-- Export date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

"@

    # Loai bo header cu va them header moi
    $sqlContent = $sqlContent -replace "(?s)^--.*?(?=CREATE|DROP|ALTER|\z)", $header

    # Fix 3: Xu ly PostGIS extensions
    Write-Host "  [PROCESS] Xu ly PostGIS extensions..." -ForegroundColor Cyan
    $sqlContent = $sqlContent -replace "CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA \w+;", "CREATE EXTENSION IF NOT EXISTS postgis;"
    $sqlContent = $sqlContent -replace "CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA \w+;", "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

    # Fix 4: Loai bo OIDS options
    Write-Host "  [PROCESS] Loai bo OIDS options..." -ForegroundColor Cyan
    $sqlContent = $sqlContent -replace "WITH \(oids = (true|false)\)", ""
    $sqlContent = $sqlContent -replace "WITHOUT OIDS", ""

    # Fix 5: Xu ly IDENTITY columns (Postgres 17 feature)
    Write-Host "  [PROCESS] Xu ly IDENTITY columns..." -ForegroundColor Cyan
    # Giu nguyen vi Postgres 15 ho tro IDENTITY

    # Ghi vao file output
    Write-Host "`n[6] Luu file output..." -ForegroundColor Yellow
    Set-Content -Path $OutputFile -Value $sqlContent -Encoding UTF8

    $outputFileInfo = Get-Item $OutputFile
    Write-Host "  [OK] File da luu: $($outputFileInfo.FullName)" -ForegroundColor Green
    Write-Host "  - Kich thuoc: $([math]::Round($outputFileInfo.Length/1MB, 2)) MB" -ForegroundColor Cyan

    # Xoa temp file
    Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue

} catch {
    Write-Host "  [ERROR] Loi export: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    exit 1
} finally {
    $env:PGPASSWORD = $null
}

# Kiem tra file output
Write-Host "`n[7] Kiem tra file output..." -ForegroundColor Yellow

# Dem so dong
$lineCount = (Get-Content $OutputFile -Encoding UTF8).Count
Write-Host "  - So dong: $lineCount" -ForegroundColor Cyan

# Kiem tra cac thanh phan chinh
$content = Get-Content $OutputFile -Encoding UTF8 -Raw

$createTableCount = ([regex]::Matches($content, "CREATE TABLE")).Count
$insertCount = ([regex]::Matches($content, "INSERT INTO")).Count

Write-Host "  - So bang (CREATE TABLE): $createTableCount" -ForegroundColor Cyan
Write-Host "  - So dong du lieu (INSERT): $insertCount" -ForegroundColor Cyan

if ($createTableCount -eq 0 -and $insertCount -eq 0) {
    Write-Host "`n  [WARNING] File co the trong hoac khong co du lieu!" -ForegroundColor Yellow
} else {
    Write-Host "`n  [OK] File hop le va co du lieu!" -ForegroundColor Green
}

Write-Host "`n=== HOAN THANH EXPORT ===" -ForegroundColor Green
Write-Host "File da san sang de import vao PostgreSQL 15!" -ForegroundColor Green
Write-Host "`nDe import vao Docker container, chay:" -ForegroundColor Yellow
Write-Host "  .\import-admin-db-full.ps1 -Force" -ForegroundColor Cyan
