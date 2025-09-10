# Deployment Guide

This guide will help you deploy your Notice Board Enhanced application to various hosting platforms and make it accessible as a public website.

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended - Easiest Full-Stack)

Railway provides the easiest way to deploy full-stack applications with built-in PostgreSQL database.

**Steps:**

1. **Create accounts:**
   - Sign up at [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Deploy:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize project
   railway init
   
   # Deploy
   railway up
   ```

3. **Configure environment:**
   - Go to your Railway dashboard
   - Add a PostgreSQL database service
   - Set environment variables:
     ```
     DATABASE_URL=postgresql://username:password@host:port/dbname
     JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
     FRONTEND_URL=https://your-app.up.railway.app
     NODE_ENV=production
     ```

4. **Your app will be live at:** `https://your-app.up.railway.app`

---

### Option 2: Vercel (Frontend) + Supabase (Database)

Great for React apps with a managed database backend.

**Steps:**

1. **Setup Supabase database:**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your connection string from Settings > Database

2. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   ```

3. **Configure environment variables in Vercel dashboard:**
   ```
   DATABASE_URL=your-supabase-postgres-url
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   ```

4. **Your app will be live at:** `https://your-app.vercel.app`

---

### Option 3: Netlify (Frontend Only) 

Best for static sites or frontend-only deployments.

**Steps:**

1. **Deploy to Netlify:**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Deploy
   netlify deploy --prod
   ```

2. **Configure environment variables in Netlify dashboard**

3. **Your app will be live at:** `https://your-app.netlify.app`

---

## 🗄️ Database Setup Options

### Option 1: Railway PostgreSQL (Recommended)
- Built-in with Railway deployment
- Automatic backups and scaling
- Easy to set up

### Option 2: Supabase (PostgreSQL with extras)
- Free tier available
- Built-in authentication (if needed)
- Real-time subscriptions
- Dashboard for data management

### Option 3: Neon Database
- Serverless PostgreSQL
- Generous free tier
- Good for development and small apps

### Option 4: PlanetScale (MySQL)
- Serverless MySQL platform
- Good scalability
- Branching for database schemas

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] **Environment Variables Ready:**
  ```bash
  DATABASE_URL=postgresql://...
  JWT_SECRET=at-least-32-characters-long-secret-key
  NODE_ENV=production
  FRONTEND_URL=https://your-domain.com
  ```

- [ ] **Database Schema Deployed:**
  ```bash
  npm run db:generate:prod
  npm run db:migrate:prod
  ```

- [ ] **Frontend Build Working:**
  ```bash
  cd src/frontend
  npm run build
  ```

- [ ] **Backend Build Working:**
  ```bash
  npm run build:backend
  ```

- [ ] **Tests Passing:**
  ```bash
  npm test
  ```

## 🔧 Step-by-Step Deployment (Railway)

### 1. Prepare Your Code

```bash
# Ensure everything is committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your repository

### 3. Setup Database

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Add PostgreSQL service:
   - Click "Add Service"
   - Select "PostgreSQL"
   - Wait for deployment

### 4. Configure Environment Variables

In your Railway project settings, add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
FRONTEND_URL=https://${{RAILWAY_STATIC_URL}}
PORT=3001
```

### 5. Deploy

Railway will automatically deploy your app. Your website will be available at:
`https://your-project-name.up.railway.app`

### 6. Setup Custom Domain (Optional)

1. In Railway dashboard, go to your service
2. Click "Settings" > "Networking" 
3. Add your custom domain
4. Configure DNS records as shown

## 🌐 Access Your Website

After successful deployment, your notice board will be accessible at:

- **Railway**: `https://your-app.up.railway.app`
- **Vercel**: `https://your-app.vercel.app`
- **Netlify**: `https://your-app.netlify.app`

## 🔍 Monitoring and Maintenance

### Health Checks
Your app includes a health check endpoint at `/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### Logs
- **Railway**: View logs in the Railway dashboard
- **Vercel**: Check function logs in Vercel dashboard
- **Netlify**: Monitor function logs in Netlify dashboard

### Database Management
- Use `npm run db:studio` locally to manage data
- Or use your hosting provider's database dashboard

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Check if database service is running
   - Ensure migrations are applied

3. **Environment Variable Issues**
   - Double-check all required variables are set
   - Restart the deployment after changes

4. **CORS Issues**
   - Update FRONTEND_URL to match your deployed domain
   - Check CORS_ORIGIN environment variable

### Getting Help

1. Check the application logs in your hosting dashboard
2. Test API endpoints manually at `/api/health`
3. Verify database connectivity
4. Check if all environment variables are properly set

## 🔐 Security Considerations

Before going live:

1. **Change default JWT secret** to a secure random string
2. **Setup proper CORS origins** for your domain
3. **Enable HTTPS** (most platforms do this automatically)
4. **Configure rate limiting** for your use case
5. **Review database permissions** and user access
6. **Setup monitoring** for unusual activity

## 💰 Cost Considerations

### Free Tier Options:
- **Railway**: $5/month after free trial, includes database
- **Vercel**: Free for personal projects, paid for teams
- **Netlify**: 100GB bandwidth/month free
- **Supabase**: 500MB database free, 2GB bandwidth
- **Neon**: 3GB storage free

### Estimated Monthly Costs:
- **Small app (< 1000 users)**: $5-15/month
- **Medium app (1000-10000 users)**: $15-50/month
- **Large app (10000+ users)**: $50+/month

Choose based on your expected traffic and feature requirements.
