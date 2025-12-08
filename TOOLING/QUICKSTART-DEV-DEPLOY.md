# 🚀 Quick Start - Dev Deploy

## 1. Prerequisites Check
```powershell
# Verify Docker host connectivity
docker -H tcp://192.168.1.217:2375 info

# Check project structure
ls ..\backend\Dockerfile
ls ..\frontend\Dockerfile
```

## 2. Run Dev Deploy
```powershell
# Full deployment (recommended first run)
.\dev-deploy.ps1

# Quick deploy (skip build if images exist)
.\dev-deploy.ps1 -SkipBuild

# Deploy only (skip tests)
.\dev-deploy.ps1 -SkipTests
```

## 3. Monitor Progress
The script will show real-time progress with emojis:
- 🏗️ Building images...
- 🚀 Deploying services...
- ⏳ Waiting for health checks...
- 🧪 Testing endpoints...
- 📊 Generating report...

## 4. Check Results
```powershell
# View the generated report
notepad dev-deploy-report.txt

# Check service status
docker -H tcp://192.168.1.217:2375 ps
```

## 5. Access Services
- **Frontend:** http://192.168.1.217:5173
- **Backend API:** http://192.168.1.217:8000
- **API Docs:** http://192.168.1.217:8000/docs

## 6. Login Credentials
- **Email:** admin@example.com
- **Password:** admin123

## 🔧 Troubleshooting

### Build Failed
```powershell
# Check Docker logs
docker -H tcp://192.168.1.217:2375 logs ansible-builder-backend-local
docker -H tcp://192.168.1.217:2375 logs ansible-builder-frontend-local
```

### Services Not Healthy
```powershell
# Restart services
docker-compose -f ..\docker-compose.local-deploy.yml restart
```

### Network Issues
- Verify 192.168.1.217:2375 is accessible
- Check firewall settings
- Ensure Docker daemon is running on target host

## 🎯 Expected Output

**Successful run should show:**
- ✅ Backend Build: PASS
- ✅ Frontend Build: PASS  
- ✅ Deployment: PASS
- ✅ Health Check: PASS
- ✅ All API Tests: PASS
- 📊 Success Rate: >80%

**Next steps after success:**
1. Test the frontend interface
2. Verify all features work
3. Check Galaxy module loading
4. Ready for Phase 2 if all good!