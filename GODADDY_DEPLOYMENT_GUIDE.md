# GoDaddy Deployment Guide

This guide will help you upload your React application to your GoDaddy hosting account.

## Prerequisites

- GoDaddy hosting account with cPanel access
- FTP credentials or cPanel File Manager access
- Your domain name configured

## Step 1: Build Your React Application

First, you need to build your React app for production. Run this command in your terminal:

```bash
cd frontend
npm install
npm run build
```

This will create a `build` folder in the `frontend` directory with all the optimized production files.

## Step 2: Prepare Files for Upload

After building, you'll find all the files you need in the `frontend/build` directory. These are the files you'll upload to GoDaddy.

## Step 3: Access Your GoDaddy cPanel

1. Log in to your GoDaddy account
2. Go to your hosting dashboard
3. Click on "cPanel" or "Web Hosting"
4. Find and click on "File Manager"

## Step 4: Navigate to public_html

1. In File Manager, navigate to the `public_html` folder
2. This is where your website files should be located
3. If you have a subdomain or addon domain, you may need to upload to a specific folder (e.g., `public_html/subdomain`)

## Step 5: Clear Existing Files (Optional but Recommended)

**IMPORTANT:** Back up any existing files before deleting them!

1. Select all files in `public_html` (or your target folder)
2. Delete them (or move to a backup folder)
3. This ensures a clean deployment

## Step 6: Upload Your Build Files

### Option A: Using cPanel File Manager

1. In File Manager, navigate to `public_html`
2. Click "Upload" button
3. Select all files from your `frontend/build` directory
4. Upload them one by one or as a zip file (then extract in cPanel)

### Option B: Using FTP (Recommended for Large Files)

1. Use an FTP client like FileZilla, WinSCP, or Cyberduck
2. Connect using your FTP credentials from GoDaddy
3. Navigate to `/public_html` on the server
4. Upload all files from `frontend/build` to `/public_html`

**FTP Connection Details:**
- Host: Usually `ftp.yourdomain.com` or the IP address provided by GoDaddy
- Username: Your cPanel username
- Password: Your cPanel password
- Port: 21 (or 22 for SFTP)

## Step 7: Upload File Structure

Make sure your file structure on GoDaddy looks like this:

```
public_html/
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
├── manifest.json
├── robots.txt
└── other build files...
```

## Step 8: Configure .htaccess for React Router

Since you're using React Router, you need to configure URL rewriting so all routes work correctly.

1. In File Manager, create a new file called `.htaccess` in `public_html`
2. Add the following content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

This ensures that all routes (like `/fr/`, `/en/`, etc.) are handled by your React app.

## Step 9: Verify Firebase Configuration

Your app uses Firebase for backend services. Make sure:

1. Your Firebase project is configured for production
2. Your Firebase environment variables are set correctly in your build
3. Your Firebase project allows requests from your GoDaddy domain

To update Firebase allowed domains:
- Go to Firebase Console
- Navigate to Authentication > Settings > Authorized domains
- Add your GoDaddy domain

## Step 10: Test Your Website

1. Visit your domain in a browser
2. Test all major features:
   - Homepage loads
   - Navigation works
   - Authentication works
   - All routes are accessible
   - Firebase functions are working

## Troubleshooting

### Issue: White screen or 404 errors
- **Solution:** Check that `.htaccess` file is uploaded and configured correctly
- Verify all files from `build` folder are uploaded

### Issue: Assets not loading (CSS/JS files)
- **Solution:** Check file permissions (should be 644 for files, 755 for folders)
- Verify paths in browser console - they should be relative paths

### Issue: Firebase errors
- **Solution:** Check Firebase console for domain authorization
- Verify environment variables are set in your build
- Check browser console for specific error messages

### Issue: Slow loading
- **Solution:** Enable GZIP compression in cPanel
- Consider using a CDN for static assets

## Quick Deployment Script

You can also use the automated script:

```bash
chmod +x deploy-to-cpanel.sh
./deploy-to-cpanel.sh
```

This will:
1. Build your frontend
2. Create a `cpanel-deployment` folder with all files ready to upload
3. Provide detailed instructions

Then upload everything from `cpanel-deployment` to `public_html` on GoDaddy.

## Important Notes

1. **Backend Services:** Your Firebase Functions will continue to work from Firebase. You don't need to deploy them to GoDaddy.

2. **Environment Variables:** If you need to change environment variables, you'll need to rebuild the app and re-upload.

3. **Updates:** To update your site, rebuild and re-upload the files.

4. **SSL Certificate:** Make sure your GoDaddy hosting has SSL enabled for HTTPS.

## Support

If you encounter issues:
- Check GoDaddy's hosting documentation
- Review browser console for errors
- Check cPanel error logs
- Verify Firebase console for backend issues




