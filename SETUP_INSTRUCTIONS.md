# Quick Setup Instructions

## Step 1: Fix PostgreSQL Password

Open the script and change the password on line 23:

```powershell
notepad C:\DuBaoMatRung\deploy-windows.ps1
```

Find this line:
```powershell
$DB_PASSWORD = "your_password_here"
```

Change to your actual PostgreSQL password:
```powershell
$DB_PASSWORD = "4"
```

Save and close.

## Step 2: Initialize Git (if needed)

Check if your folder is a git repository:
```powershell
cd C:\DuBaoMatRung
git status
```

If you see "fatal: not a git repository", initialize it:
```powershell
git init
git remote add origin <your-repo-url>
git fetch origin
git checkout main
```

## Step 3: Run Deployment

```powershell
cd C:\DuBaoMatRung
.\deploy-windows.ps1 -FirstTime
```

## Step 4: Update PM2 (if needed)

If you see PM2 update warning:
```powershell
pm2 update
```

Then run deployment again:
```powershell
.\deploy-windows.ps1 -FirstTime
```

## Common Issues

### PostgreSQL Connection Error

If you see: `password authentication failed for user "postgres"`

**Solution:**
1. Check PostgreSQL is running: `Get-Service postgresql*`
2. Start if needed: `Start-Service postgresql-x64-*`
3. Update password in script (line 23)
4. Or change DB_USER to your PostgreSQL username

### PM2 Warning

The warning "In-memory PM2 is out-of-date" is NOT an error.

**Solution:**
```powershell
pm2 update
```

## Access After Deployment

- Frontend: http://103.56.161.239:5173
- API Gateway: http://103.56.161.239:3000
- Swagger: http://103.56.161.239:3000/api-docs

## Management Commands

```powershell
# View status
pm2 status

# View logs
pm2 logs

# Restart all
pm2 restart all

# Stop all
pm2 stop all
```

## Update Code Later

```powershell
cd C:\DuBaoMatRung
.\update-code.ps1
```
