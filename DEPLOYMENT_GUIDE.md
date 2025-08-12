# ARS Project - IIS Deployment Guide

## Prerequisites
- Windows Server with IIS installed
- Node.js 18+ installed
- PostgreSQL database
- Python 3.8+ for AI microservice
- PM2 for process management: `npm install -g pm2`

## Step 1: Prepare the Server

### 1.1 Install Required IIS Features
```powershell
# Run as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment
Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HealthAndDiagnostics
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Performance
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerManagementTools
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-IIS6ManagementCompatibility
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Metabase
```

### 1.2 Install URL Rewrite Module
Download and install from: https://www.iis.net/downloads/microsoft/url-rewrite

## Step 2: Database Setup

### 2.1 Create PostgreSQL Database
```sql
CREATE DATABASE ars_production;
CREATE USER ars_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ars_production TO ars_user;
```

### 2.2 Update Server Environment Variables
Create `server/.env.production`:
```env
DATABASE_URL="postgresql://ars_user:your_secure_password@localhost:5432/ars_production"
JWT_SECRET="your_jwt_secret_key_here"
PORT=8000
NODE_ENV=production
```

## Step 3: Deploy Backend API

### 3.1 Build and Deploy
```bash
cd server
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.2 Run Database Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

## Step 4: Deploy AI Microservice

### 4.1 Install Python Dependencies
```bash
cd ai-microservice
pip install -r requirements.txt
```

### 4.2 Create Windows Service or use PM2
```bash
pm2 start ai_microservice.py --name ars-ai --interpreter python
```

## Step 5: Deploy Frontend to IIS

### 5.1 Update Production URLs
Edit `frontend/.env.production` with your server IP:
```env
REACT_APP_API_URL=http://10.34.60.63:8000/api
REACT_APP_AI_MICROSERVICE_URL=http://10.34.60.63:8001
```

### 5.2 Build and Deploy
```bash
# Run the deployment script
deploy-to-iis.bat
```

### 5.3 Configure IIS Site
1. Open IIS Manager
2. Create new site:
   - Site name: ARS
   - Physical path: C:\inetpub\wwwroot\ars
   - Port: 80 (or 443 for HTTPS)
3. Set Application Pool to "No Managed Code"

## Step 6: Configure Firewall

### 6.1 Open Required Ports
```powershell
# Frontend (IIS)
New-NetFirewallRule -DisplayName "ARS Frontend" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Backend API
New-NetFirewallRule -DisplayName "ARS API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow

# AI Microservice
New-NetFirewallRule -DisplayName "ARS AI" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow

# PostgreSQL (if remote access needed)
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
```

## Step 7: SSL Configuration (Recommended)

### 7.1 Install SSL Certificate
1. Obtain SSL certificate
2. In IIS Manager, select your site
3. Click "Bindings" → "Add"
4. Type: https, Port: 443, SSL certificate: [your certificate]

### 7.2 Update Frontend URLs for HTTPS
```env
REACT_APP_API_URL=https://YOUR_DOMAIN:8000/api
REACT_APP_AI_MICROSERVICE_URL=https://YOUR_DOMAIN:8001
```

## Step 8: Monitoring and Maintenance

### 8.1 PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 restart all
```

### 8.2 IIS Logs
Check logs at: `C:\inetpub\logs\LogFiles\W3SVC1\`

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Ensure backend CORS is configured for your domain
2. **404 Errors**: Verify web.config is in place and URL Rewrite is installed
3. **API Connection**: Check firewall rules and service status
4. **Database Connection**: Verify connection string and user permissions

### Health Check URLs:
- Frontend: `http://10.34.60.63/`
- Backend API: `http://10.34.60.63:8000/api`
- AI Service: `http://10.34.60.63:8001/health`

## Security Checklist
- [ ] Change default passwords
- [ ] Configure HTTPS
- [ ] Set up proper firewall rules
- [ ] Regular security updates
- [ ] Database backup strategy
- [ ] Monitor logs regularly