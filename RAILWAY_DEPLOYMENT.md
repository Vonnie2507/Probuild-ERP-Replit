# Railway Deployment Guide for Probuild ERP

This guide will help you successfully deploy your Probuild ERP application to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Your GitHub repository connected to Railway
3. All environment variables ready

## Required Environment Variables

You need to set these environment variables in Railway:

### Database
- `DATABASE_URL` - Your Neon PostgreSQL connection string
  - Format: `postgresql://user:password@host/database?sslmode=require`

### Session Management
- `SESSION_SECRET` - A secure random string for session encryption
  - Generate one: `openssl rand -base64 32`

### Stripe (Payment Gateway)
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

### Twilio (SMS)
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

### Basiq (Open Banking) - Optional
- `BASIQ_API_KEY` - Your Basiq API key
- `BASIQ_WEBHOOK_SECRET` - Your Basiq webhook secret

### Google Maps (for address autocomplete)
- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key

### Application
- `NODE_ENV` - Set to `production`
- `PORT` - Railway will set this automatically (usually 5000)

## Deployment Steps

### 1. Create New Project in Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `Probuild-ERP-Replit` repository
5. Railway will automatically detect the configuration

### 2. Configure Environment Variables

1. Click on your deployed service
2. Go to "Variables" tab
3. Add all the required environment variables listed above
4. Click "Deploy" to restart with new variables

### 3. Monitor Deployment

1. Go to "Deployments" tab
2. Click on the latest deployment
3. Watch the build logs for any errors
4. The build process includes:
   - Installing dependencies
   - Building the React frontend (with Vite)
   - Building the Express backend (with esbuild)
   - Starting the production server

### 4. Database Setup (if needed)

If this is your first deployment, you may need to push your database schema:

```bash
# Locally, with DATABASE_URL set to your Neon database
npm run db:push
```

### 5. Access Your Application

Once deployed successfully:
1. Railway will provide a public URL (e.g., `your-app.up.railway.app`)
2. Click the URL to access your application
3. You can also add a custom domain in Railway settings

## Troubleshooting

### Build Fails with "Out of Memory"

The build process requires significant memory. If you see heap errors:
- Railway's free tier has memory limits
- Consider upgrading to a paid plan for more resources
- The configuration files already include memory optimization

### Application Crashes on Start

Check these common issues:
1. **Missing Environment Variables**: Ensure all required variables are set
2. **Database Connection**: Verify `DATABASE_URL` is correct and accessible
3. **Port Configuration**: Railway automatically sets `PORT`, don't override it

### Database Connection Issues

1. Ensure Neon database allows connections from Railway
2. Neon databases should work by default (serverless-friendly)
3. Check the connection string format includes `?sslmode=require`

### Session Issues

1. The app uses PostgreSQL-backed sessions
2. Ensure `SESSION_SECRET` is set
3. The session table is created automatically on first run

## Configuration Files

Your repository now includes these Railway-specific files:

- `railway.json` - Railway configuration
- `nixpacks.toml` - Build configuration with memory settings
- `Procfile` - Process definition
- `.railwayignore` - Files to exclude from deployment

## Build Process Details

1. **Install**: `npm ci` (clean install)
2. **Build**: 
   - Frontend: Vite builds React app to `dist/public`
   - Backend: esbuild bundles server to `dist/index.cjs`
3. **Start**: `npm run start` runs `node dist/index.cjs`

## Performance Optimization

The build configuration includes:
- Tree-shaking for smaller bundle sizes
- Minification of JavaScript
- Optimized production React builds
- Server-side bundling of key dependencies

## Webhooks Configuration

After deployment, update your webhook URLs:

### Stripe Webhooks
Set in Stripe Dashboard:
- URL: `https://your-app.up.railway.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `payment_intent.succeeded`

### Basiq Webhooks (if using)
Set in Basiq Dashboard:
- URL: `https://your-app.up.railway.app/api/basiq/webhook`

## Monitoring

Railway provides:
- Real-time logs in the dashboard
- Metrics (CPU, Memory, Network)
- Deployment history
- Automatic health checks

## Scaling

For production use:
1. Consider upgrading Railway plan for:
   - More memory and CPU
   - Multiple replicas
   - Better availability
2. Monitor your resource usage
3. Set up alerts for errors

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Review application logs in Railway dashboard
3. Verify all environment variables are set correctly
4. Ensure database is accessible and has correct schema

## Next Steps

After successful deployment:
1. Set up a custom domain (optional)
2. Configure webhooks for Stripe and Basiq
3. Test all major features
4. Set up monitoring and alerts
5. Create your first admin user

---

**Note**: This application requires external services (Neon, Stripe, Twilio) to be fully functional. Ensure all third-party services are properly configured and accessible.
