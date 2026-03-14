# Deployment Guide

## Option 1: Vercel (Static Frontend Only)
Vercel is great for the React frontend but has limitations with Express API routes in the same project.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend only (API won't work)
vercel --prod
```

**Note:** For full API functionality, use Option 2 or 3.

## Option 2: Railway (Recommended)
Best for full-stack Node.js applications with Express.

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Setup:**
1. Create account at https://railway.app
2. Connect GitHub repo
3. Add environment variables in Railway dashboard
4. Deploy automatically on push

## Option 3: Render
Free tier available for web services.

```bash
# Just push to GitHub, Render will auto-deploy
```

**Setup:**
1. Create account at https://render.com
2. Create "Web Service"
3. Connect GitHub repo
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables

## Option 4: Fly.io
Great performance, free tier available.

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch
fly deploy
```

## Option 5: Self-Hosted (VPS/Docker)
Full control, requires server management.

```bash
# Build and run with Docker
docker-compose up -d
```

## Environment Variables for Production

Make sure to set these in your deployment platform:

```
DATABASE_URL="your-prisma-accelerate-url"
GEMINI_API_KEY="your-key"
OPENAI_API_KEY="your-key" (optional)
HUGGINGFACE_API_KEY="your-key" (optional)
HIBP_API_KEY="your-key" (optional)
NODE_ENV="production"
PORT="3000"
```

## Current Deployment Status

**Vercel:** Frontend deployed, API routes not working (serverless limitation)
**Recommended:** Deploy to Railway or Render for full functionality

## Quick Fix for Local Development

If you just want to run locally:

```bash
cd /root/.openclaw/workspace/a7-project
npm run dev
```

Then access at http://localhost:3000
