# CKD Predictor - Deployment Guide for Render

## Prerequisites

Before deploying to Render, ensure you have:

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to GitHub (Render integrates with GitHub)
3. **Git Installed**: For version control
4. **Node.js 18+**: For local testing

## Step 1: Prepare Your Repository

### 1.1 Initialize Git Repository

```bash
cd ckd-predictor
git init
git add .
git commit -m "Initial commit: CKD Predictor with PostgreSQL and ML model"
```

### 1.2 Create .gitignore

Ensure your `.gitignore` includes:

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
__pycache__/
*.pyc
```

### 1.3 Verify All Required Files

Ensure the following files are present:

```
✓ package.json
✓ server.ts
✓ bridge.py
✓ kidney_disease_model.pkl
✓ requirements.txt
✓ render.yaml
✓ .env.example
✓ src/ (React components)
✓ vite.config.ts
✓ tsconfig.json
```

## Step 2: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/ckd-predictor.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Render

### 3.1 Connect GitHub to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Select **"Connect a repository"**
4. Authorize Render to access your GitHub account
5. Select the `ckd-predictor` repository

### 3.2 Configure the Web Service

Fill in the deployment settings:

| Field | Value |
|-------|-------|
| **Name** | `ckd-predictor` |
| **Environment** | `Node` |
| **Build Command** | `npm install && pip install -r requirements.txt && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Standard` (or higher for production) |
| **Auto-deploy** | Enable (recommended) |

### 3.3 Add Environment Variables

1. In the Render dashboard, go to **"Environment"**
2. Add the following variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `18.0.0` |

**Note**: The `DATABASE_URL` will be automatically set by Render when you create the PostgreSQL database.

### 3.4 Create PostgreSQL Database

1. Click **"New"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `ckd-db`
   - **Database**: `ckd_predictor`
   - **User**: `ckd_user`
   - **Region**: Same as your web service
   - **PostgreSQL Version**: 15

3. Click **"Create Database"**

### 3.5 Link Database to Web Service

1. Go back to your web service settings
2. Under **"Environment"**, the `DATABASE_URL` should now appear automatically
3. If not, manually add it from the database connection string

### 3.6 Deploy

1. Click **"Create Web Service"**
2. Render will automatically start the build process
3. Monitor the logs to ensure everything deploys successfully

## Step 4: Verify Deployment

### 4.1 Check Service Status

1. Go to your service dashboard on Render
2. Look for the green checkmark indicating the service is running
3. Copy the service URL (e.g., `https://ckd-predictor.onrender.com`)

### 4.2 Test the Application

Open your browser and navigate to:
```
https://ckd-predictor.onrender.com
```

You should see the CKD Predictor interface.

### 4.3 Test the API

Test the prediction endpoint:

```bash
curl -X POST https://ckd-predictor.onrender.com/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "age": 45,
      "bp": 80,
      "sg": 1.02,
      "al": 0,
      "su": 0,
      "bgr": 121,
      "bu": 36,
      "sc": 1.2,
      "sod": 138,
      "pot": 4.4,
      "hemo": 15.4,
      "pcv": 44,
      "wc": 7800,
      "rc": 5.2,
      "rbc": "normal",
      "pc": "normal",
      "pcc": "notpresent",
      "ba": "notpresent",
      "htn": "no",
      "dm": "no",
      "cad": "no",
      "appet": "good",
      "pe": "no",
      "ane": "no"
    },
    "userId": "test-user"
  }'
```

Expected response:
```json
{
  "diagnosis": "Healthy",
  "probability": 0.25,
  "shapValues": [...],
  "summary": "..."
}
```

### 4.4 Test Statistics Endpoint

```bash
curl https://ckd-predictor.onrender.com/api/stats
```

Expected response:
```json
{
  "totalAssessments": 1,
  "ckdDetected": 0,
  "healthy": 1,
  "recentAssessments": [...]
}
```

## Step 5: Monitor and Maintain

### 5.1 View Logs

1. Go to your service dashboard
2. Click **"Logs"** tab
3. Monitor for errors or warnings

### 5.2 Database Backups

1. Go to your PostgreSQL database dashboard
2. Click **"Backups"** tab
3. Automatic backups are created daily (7-day retention)

### 5.3 Performance Monitoring

1. Use Render's built-in metrics:
   - CPU usage
   - Memory usage
   - Request count
   - Response time

2. For advanced monitoring, integrate with:
   - New Relic
   - Datadog
   - CloudWatch

### 5.4 Update Your Application

To deploy updates:

```bash
# Make changes to your code
git add .
git commit -m "Update: [description]"
git push origin main
```

Render will automatically redeploy if auto-deploy is enabled.

## Troubleshooting

### Build Fails

**Error**: `npm ERR! 404 Not Found`

**Solution**: 
- Ensure `package.json` has correct dependencies
- Check that all required packages are listed
- Run `npm install` locally to verify

**Error**: `Python module not found`

**Solution**:
- Ensure `requirements.txt` includes all dependencies
- Verify Python version compatibility
- Check that `bridge.py` is in the root directory

### Application Crashes

**Error**: `Cannot find module 'express'`

**Solution**:
- Run `npm install` locally
- Ensure `package.json` is committed to git
- Check build command in Render settings

**Error**: `DATABASE_URL is not set`

**Solution**:
- Verify PostgreSQL database is created
- Check that web service is linked to database
- Restart the web service

### Slow Performance

**Causes**:
- Model loading time (50-200ms per prediction)
- Database query time
- Network latency

**Solutions**:
- Upgrade Render instance type
- Add database indexes
- Implement caching
- Use a dedicated ML service

### Connection Refused

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
- Ensure PostgreSQL database is running
- Check `DATABASE_URL` format
- Verify network connectivity
- Check firewall rules

## Advanced Configuration

### 3.1 Custom Domain

1. Go to your service settings
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `ckd-predictor.com`)
4. Follow DNS configuration instructions

### 3.2 SSL Certificate

Render automatically provides free SSL certificates via Let's Encrypt.

### 3.3 Environment-Specific Builds

Create multiple services for different environments:

```
ckd-predictor-dev (development branch)
ckd-predictor-staging (staging branch)
ckd-predictor-prod (main branch)
```

### 3.4 Scaling

For high-traffic applications:

1. Upgrade instance type (Standard → Pro → Premium)
2. Add read replicas for the database
3. Implement caching (Redis)
4. Use a CDN (Cloudflare)

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Database Credentials**: Use Render's automatic management
3. **SSL/TLS**: Always enabled on Render
4. **API Authentication**: Consider adding API keys for `/api/predict`
5. **Rate Limiting**: Implement to prevent abuse
6. **Input Validation**: Validate all user inputs
7. **CORS**: Configure appropriate CORS headers

## Cost Estimation

### Render Pricing (as of 2024)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Web Service | $0 (sleeps after 15 min inactivity) | $7/month (Standard) |
| PostgreSQL | $0 (limited) | $15/month (Starter) |
| **Total** | **$0** | **$22+/month** |

## Rollback

If deployment fails:

1. Go to your service dashboard
2. Click **"Deployments"**
3. Select a previous successful deployment
4. Click **"Redeploy"**

## Support

For issues with Render:
- [Render Documentation](https://render.com/docs)
- [Render Support](https://support.render.com)

For issues with the CKD Predictor:
- Check `DATABASE_SETUP.md`
- Check `MODEL_INTEGRATION.md`
- Review application logs

---

**Deployment Checklist**:
- [ ] Git repository created and code pushed
- [ ] Render account created
- [ ] GitHub connected to Render
- [ ] Web service configured
- [ ] PostgreSQL database created
- [ ] Environment variables set
- [ ] Build and deployment successful
- [ ] Application accessible via URL
- [ ] API endpoints tested
- [ ] Database verified

**Congratulations! Your CKD Predictor is now live on Render! 🎉**
