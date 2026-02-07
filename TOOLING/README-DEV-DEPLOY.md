# 🚀 Dev Deploy Tool

PowerShell script for automated development deployment of Automation Factory.

## 📋 Overview

`dev-deploy.ps1` is a comprehensive deployment script that:
- Builds Docker images on remote host (192.168.1.217:2375)
- Deploys services locally using docker-compose
- Tests all API endpoints and functionality
- Generates detailed test reports

## 🔧 Usage

### Basic Usage
```powershell
.\dev-deploy.ps1
```

### Advanced Options
```powershell
# Skip build phase (use existing images)
.\dev-deploy.ps1 -SkipBuild

# Skip testing phase
.\dev-deploy.ps1 -SkipTests

# Use different Docker host
.\dev-deploy.ps1 -DockerHost "192.168.1.100:2375"

# Enable verbose logging
.\dev-deploy.ps1 -Verbose
```

## 🏗️ What It Does

### 1. Version Management
- Automatically increments build versions
- Backend: `X.Y.Z_n` format (increments `n`)
- Frontend: `X.Y.Z` format (increments `Z`)
- Updates version files in place

### 2. Docker Build
- Builds backend image: `automation-factory-backend:X.Y.Z_n`
- Builds frontend image: `automation-factory-frontend:X.Y.Z`
- Uses remote Docker host for building
- Validates build success

### 3. Local Deployment
- Creates `docker-compose.local-deploy.yml`
- Deploys with SQLite backend configuration
- Exposes services on standard ports:
  - Backend: `http://192.168.1.217:8000`
  - Frontend: `http://192.168.1.217:5173`

### 4. Health Checks
- Waits for services to become healthy
- Monitors container status
- Validates service readiness

### 5. Comprehensive Testing
- Frontend accessibility test
- Backend API endpoint tests:
  - `/api/version`
  - `/api/health` 
  - `/api/auth/login` (with credentials)
  - `/api/galaxy/namespaces`
  - `/api/galaxy/smart/status`
- Galaxy data validation
- Response time measurement

### 6. Report Generation
- Saves detailed report to `dev-deploy-report.txt`
- Includes build status, test results, errors
- Shows performance metrics and Galaxy data
- Provides next steps and URLs

## 📊 Test Report Structure

```
🚀 DEV DEPLOYMENT TEST REPORT
========================================

📊 SUMMARY
Total Tests: 12
Passed: 10
Failed: 2
Success Rate: 83.33%
Overall Status: ✅ PASS

🔧 BUILD STATUS
Backend Build: ✅ PASS
Frontend Build: ✅ PASS

🚀 DEPLOYMENT STATUS  
Deployment: ✅ PASS
Health Check: ✅ PASS
Frontend Access: ✅ PASS

🌐 API ENDPOINT TESTS
Version: ✅ PASS (45ms)
Health: ✅ PASS (12ms)
Authentication: ✅ PASS (234ms)
Galaxy Namespaces: ✅ PASS (1250ms)
Galaxy Smart Status: ✅ PASS (89ms)

🌌 GALAXY DATA STATUS
Galaxy Data Loading: ✅ WORKING

🔧 NEXT STEPS
✅ All major tests passed! Ready for development testing.

Frontend URL: http://192.168.1.217:5173
Backend URL: http://192.168.1.217:8000
API Docs: http://192.168.1.217:8000/docs
```

## ⚙️ Configuration

### Docker Compose Template
The script creates `docker-compose.local-deploy.yml` with:
- SQLite backend configuration
- Health checks for backend
- Development environment variables
- Proper networking between services

### Default Credentials
- **Username:** `admin@example.com`
- **Password:** `admin123`

### Environment Variables
- `DATABASE_TYPE=sqlite`
- `SQLITE_DB_PATH=/tmp/automation_factory.db`
- `DEBUG=true`
- `JWT_SECRET_KEY=dev-secret-key-change-in-production`

## 🧪 Testing & Validation

### Pre-run Validation
```powershell
.\test-dev-deploy.ps1
```

Tests:
- PowerShell script syntax
- Docker host connectivity
- Project file structure
- Version increment logic
- Script help/options

### Common Issues & Solutions

#### 🐳 Docker Connection Issues
```
❌ Docker connection failed
```
**Solution:** Verify Docker daemon is running on 192.168.1.217:2375

#### 📦 Build Failures
```
❌ Failed to build backend image
```
**Solution:** Check Dockerfile syntax and dependencies

#### ⏳ Service Health Timeout
```
❌ Services did not become healthy within 120 seconds
```
**Solution:** Check container logs and port availability

#### 🌐 Galaxy API Issues
```
❌ Galaxy namespaces test failed
```
**Solution:** Check internet connectivity and Galaxy API status

## 📁 Files Created

- `docker-compose.local-deploy.yml` - Auto-generated compose file
- `dev-deploy-report.txt` - Detailed test report
- Updated version files (backend/frontend)

## 🔗 Integration with Development Process

This script fits into the development workflow as:
1. **Phase 1 Development:** Use `dev-deploy.ps1` for local testing
2. **Validation:** Review generated report before Phase 2
3. **Integration Ready:** Success rate >80% indicates readiness

## 🚨 Prerequisites

- PowerShell 5.1+
- Docker access to 192.168.1.217:2375
- Network connectivity to Ansible Galaxy API
- Valid project structure with required files

## 📝 Logs & Debugging

All output is logged with timestamps and emojis:
```
2025-12-08 14:30:15 [INFO] ℹ️ Starting Dev Deployment Process
2025-12-08 14:30:16 [SUCCESS] ✅ Successfully built backend image
2025-12-08 14:30:45 [ERROR] ❌ Galaxy namespaces test failed: timeout
```

Use `-Verbose` for additional debugging information.