# 🚀 Deploy AL Danube to Vercel

## Quick Deploy (Recommended)

1. **Go to Vercel**
   - Visit: https://vercel.com/new
   - Sign in with your GitHub account

2. **Import Repository**
   - Click "Import Project"
   - Select: `MohamedMamdouhElmetwaly/AL-Danube`
   - Click "Import"

3. **Configure (Keep Defaults)**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (leave as is)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `.next` (auto-filled)
   - Install Command: `npm install` (auto-filled)

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Done! You'll get a live URL like: `https://al-danube.vercel.app`

## Alternative: Deploy to Netlify

1. **Go to Netlify**
   - Visit: https://app.netlify.com/start
   - Connect GitHub account

2. **Import Repository**
   - Select: `AL-Danube`
   - Build command: `npm run build`
   - Publish directory: `.next`

3. **Deploy**
   - Click "Deploy site"
   - Get your live URL

## Alternative: Deploy to Cloudflare Pages

1. **Go to Cloudflare Pages**
   - Visit: https://dash.cloudflare.com/
   - Click "Pages" → "Create a project"

2. **Connect GitHub**
   - Select: `AL-Danube` repository
   - Build command: `npm run build`
   - Build output: `.next`

3. **Deploy**
   - Click "Save and Deploy"

## What You'll Get

After deployment, you'll have:
- ✅ Live URL (e.g., `https://your-project.vercel.app`)
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments on git push
- ✅ Preview deployments for pull requests

## Note

GitHub only shows the code and README. To run the actual 3D viewer application, you MUST deploy it to a hosting platform like Vercel, Netlify, or Cloudflare Pages.

The hosting platforms will:
1. Clone your repository
2. Install dependencies (`npm install`)
3. Build the project (`npm run build`)
4. Serve the application to users worldwide

---

**Recommended: Use Vercel** - It's made by the creators of Next.js and provides the best performance and easiest setup.
