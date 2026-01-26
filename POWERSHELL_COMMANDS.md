# PowerShell Commands Reference for XavLink

## 🚀 Quick Start Commands

### 1. **Navigate to Project Directory**
```powershell
cd D:\html\project\xavlink
```

### 2. **Backend Commands**
```powershell
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run Prisma commands
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio

# Check for outdated packages
npm outdated

# Security audit
npm audit
npm audit fix
```

### 3. **Frontend (Web) Commands**
```powershell
# Navigate to web
cd web

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### 4. **Mobile App Commands**
```powershell
# Navigate to mobile
cd mobile

# Install dependencies (if not already done)
npm install

# Start Expo development server
npm start
# or
npx expo start

# Start for Android
npm run android
# or
npx expo start --android

# Start for iOS (Mac only)
npm run ios
# or
npx expo start --ios

# Start web version
npm run web
# or
npx expo start --web
```

## 📦 Package Management

### 5. **Update Dependencies**
```powershell
# Update all packages to latest within semver range
npm update

# Update specific package
npm install package-name@latest

# Check what's outdated
npm outdated

# Install specific version
npm install package-name@version
```

### 6. **Security & Audit**
```powershell
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may break things)
npm audit fix --force

# Check outdated packages
npm outdated
```

## 🔧 Development Tools

### 7. **Database Commands (Prisma)**
```powershell
# Generate Prisma Client
cd backend
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Push schema changes (development)
npx prisma db push
```

### 8. **Git Commands**
```powershell
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to remote
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b branch-name

# Switch branch
git checkout branch-name
```

### 9. **System & Environment**
```powershell
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PowerShell version
$PSVersionTable.PSVersion

# List environment variables
Get-ChildItem Env:

# Set environment variable (current session)
$env:VARIABLE_NAME = "value"

# Check current directory
Get-Location
# or
pwd

# List directory contents
Get-ChildItem
# or
ls
# or
dir

# Clear terminal
Clear-Host
# or
cls
```

## 🐛 Troubleshooting

### Fix Expo Not Found Error
```powershell
# If 'expo' is not recognized, install it globally or use npx
cd mobile
npx expo start

# Or install globally
npm install -g expo-cli
```

### Fix Permission Errors
```powershell
# Run PowerShell as Administrator (Right-click → Run as Administrator)
# Then run your commands
```

### Clear npm Cache
```powershell
npm cache clean --force
```

### Remove node_modules and Reinstall
```powershell
# Remove node_modules
Remove-Item -Recurse -Force node_modules

# Remove package-lock.json (optional)
Remove-Item package-lock.json

# Reinstall
npm install
```

### Fix Port Already in Use
```powershell
# Find process using port (e.g., 5000)
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use PowerShell
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

## 📝 Common Workflows

### Start All Services (Development)
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend Web
cd web
npm run dev

# Terminal 3 - Mobile
cd mobile
npx expo start
```

### Update All Dependencies
```powershell
# Backend
cd backend
npm update
npm audit fix

# Frontend Web
cd web
npm update
npm audit fix

# Mobile
cd mobile
npm update
npm audit fix
```

### Build for Production
```powershell
# Backend
cd backend
npm run build

# Frontend Web
cd web
npm run build
```

## 🔍 Useful Aliases (Optional)

Add these to your PowerShell profile for convenience:
```powershell
# Edit profile
notepad $PROFILE

# Add aliases
function xav-backend { cd D:\html\project\xavlink\backend }
function xav-web { cd D:\html\project\xavlink\web }
function xav-mobile { cd D:\html\project\xavlink\mobile }
function xav-root { cd D:\html\project\xavlink }

# Then use:
# xav-backend
# xav-web
# xav-mobile
# xav-root
```

## 📚 Additional Resources

- **Node.js**: https://nodejs.org/
- **npm**: https://www.npmjs.com/
- **Expo**: https://docs.expo.dev/
- **Prisma**: https://www.prisma.io/docs/
- **PowerShell**: https://docs.microsoft.com/powershell/

---

**Note**: If you're using Git Bash or WSL, commands may differ. Use PowerShell-specific syntax when in PowerShell.
