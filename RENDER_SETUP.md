# Render Deployment Setup

## Quick Start

### 1. Create Render Account
- Sign up at https://render.com
- Connect your GitHub account

### 2. Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `Mirxa27/A7`
3. Configure service:
   - **Name:** `agent7-intelligence`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`

### 3. Add Environment Variables
In Render Dashboard → Settings → Environment:

```
NODE_ENV=production
DATABASE_URL=your_prisma_accelerate_url
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key (optional)
HUGGINGFACE_API_KEY=your_hf_key (optional)
HIBP_API_KEY=your_hibp_key (optional)
SESSION_SECRET=your_random_secret
```

### 4. Enable Auto-Deploy
- Go to Settings → Build & Deploy
- Enable "Auto-Deploy on Push"
- Or use Deploy Hook for GitHub Actions

### 5. Get Deploy Hook URL (Optional)
- Settings → Deploy Hook
- Generate URL: `https://api.render.com/deploy/srv-xxxxxxxxxxxxxxxxxxxxxxxx?key=yyyyyyyyyyyy`
- Add to GitHub Secrets as `RENDER_DEPLOY_HOOK`

### 6. Add GitHub Secrets
Go to GitHub Repo → Settings → Secrets → Actions:

```
RENDER_API_KEY=7b9f2d2f-6b76-4ed8-a717-9af795d2fccb
RENDER_SERVICE_ID=your_service_id_from_render_dashboard
RENDER_DEPLOY_HOOK=your_deploy_hook_url (optional)
```

## Deployment Methods

### Method 1: Auto-Deploy on Push (Recommended)
Render automatically deploys when you push to main branch.

### Method 2: GitHub Actions with Deploy Hook
1. Get Deploy Hook from Render Dashboard
2. Add as `RENDER_DEPLOY_HOOK` secret in GitHub
3. Push to main → GitHub Action triggers Render deploy

### Method 3: Manual Deploy
```bash
# Via Render CLI (optional)
npm install -g @render/cli
render login
render deploy
```

## Verify Deployment

After deployment, verify these endpoints:

```bash
# Health check
curl https://your-service-name.onrender.com/api/health

# Status with cache stats
curl https://your-service-name.onrender.com/api/status

# Test OSINT
curl https://your-service-name.onrender.com/api/osint/geolocation/8.8.8.8
```

## Troubleshooting

### Build Fails
- Check build logs in Render Dashboard
- Verify all environment variables are set
- Ensure `npx prisma generate` runs before build

### API Returns 404
- Check service is running (not sleeping)
- Verify health check passes
- Check server logs for errors

### Database Connection Failed
- Verify DATABASE_URL is correct
- Ensure Prisma Accelerate is configured
- Check database is accessible from Render

## Free Tier Limits

- **Web Services:** 512 MB RAM, shared CPU
- **Bandwidth:** 100 GB/month
- **Build Time:** 15 minutes max
- **Sleep:** After 15 minutes of inactivity

Upgrade to paid tier for production use.

## Using Blueprint (render.yaml)

The included `render.yaml` allows one-click deployment:

1. Go to https://dashboard.render.com/blueprints
2. Click "New Blueprint Instance"
3. Connect your GitHub repo
4. Render will auto-configure the service
5. Add your environment variables
6. Deploy!

## Support

- Render Docs: https://render.com/docs
- Troubleshooting: https://render.com/docs/troubleshooting-deploys
