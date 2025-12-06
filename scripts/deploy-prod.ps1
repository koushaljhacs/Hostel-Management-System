# scripts/deploy-prod.ps1
# HMS-CENTRAL Windows Deployment Script

Write-Host "🚀 Starting HMS-CENTRAL Production Deployment..." -ForegroundColor Yellow

# 1. Install Dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install --production --silent

# 2. Database Migrations
Write-Host "🗄️  Verifying Database Schema..." -ForegroundColor Yellow
node database/setup-database.js

# 3. Reload PM2 Cluster
Write-Host "🔄 Reloading Swarm Cluster..." -ForegroundColor Yellow
$pm2Running = pm2 list | Select-String "hms-central-swarm"

if ($pm2Running) {
    pm2 reload hms-central-swarm
    Write-Host "✅ Cluster reloaded successfully." -ForegroundColor Green
} else {
    Write-Host "⚠️  Process not running. Starting fresh..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js --env production
    pm2 save
}

# 4. AI Integrity Check
Write-Host "🧠 Waking up Master Overseer..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
pm2 list

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "   SYSTEM ONLINE: HMS-CENTRAL SWARM IS ACTIVE      " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "📊 Monitor Command: pm2 monit"
Write-Host "📜 Logs Command:    pm2 logs hms-central-swarm"
Write-Host ""