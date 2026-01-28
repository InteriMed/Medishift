# V8 Fatal Error Fix Guide

## Error Description
```
# Fatal error in , line 0
# unreachable code
```

This V8 engine fatal error occurs during JavaScript compilation/optimization, typically caused by:
- Corrupted build cache
- Memory issues during compilation
- Incompatible Node.js version
- Corrupted node_modules

## Quick Fix Steps

### Option 1: Automated Cleanup (Recommended)

**On Linux/WSL:**
```bash
chmod +x fix-v8-error.sh
./fix-v8-error.sh
```

**On Windows PowerShell:**
```powershell
.\fix-v8-error.ps1
```

### Option 2: Manual Cleanup

1. **Remove build artifacts:**
   ```bash
   rm -rf node_modules build .cache package-lock.json
   npm cache clean --force
   ```

2. **Reinstall dependencies:**
   ```bash
   npm install
   ```

3. **Start with increased memory:**
   ```bash
   NODE_OPTIONS=--max-old-space-size=4096 npm start
   ```

### Option 3: Update Node.js

Ensure you're using Node.js 18.x or 20.x LTS:
```bash
node --version  # Should show v18.x.x or v20.x.x
```

If not, update Node.js:
- Download from: https://nodejs.org/
- Or use nvm: `nvm install 20 && nvm use 20`

## Configuration Changes Made

1. **Updated `package.json` scripts:**
   - Added `NODE_OPTIONS=--max-old-space-size=4096` to start/build commands
   - Added cleanup scripts for easy maintenance

2. **Updated `craco.config.js`:**
   - Added webpack optimization settings
   - Improved code splitting configuration

## If Error Persists

1. **Check for native module issues:**
   - `react-pdf` uses PDF.js which may have compatibility issues
   - Try removing and reinstalling: `npm uninstall react-pdf && npm install react-pdf`

2. **Try different Node.js version:**
   ```bash
   nvm install 18
   nvm use 18
   npm install
   npm start
   ```

3. **Disable webpack optimizations temporarily:**
   - Edit `craco.config.js` and comment out optimization settings
   - This will make builds slower but may avoid the crash

4. **Check system memory:**
   - Ensure you have at least 4GB free RAM
   - Close other applications

5. **Use alternative build tool:**
   ```bash
   npm run eject  # (one-way operation, creates webpack.config.js)
   # Then manually configure webpack
   ```

## Prevention

- Regularly clean build cache: `npm run clean` (or `npm run clean:win` on Windows)
- Keep Node.js updated to latest LTS
- Monitor memory usage during builds
- Use `.nvmrc` file to lock Node.js version for the project

## Additional Resources

- Node.js Memory Issues: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
- Webpack Performance: https://webpack.js.org/guides/performance/
- V8 Engine Issues: https://github.com/nodejs/node/issues

