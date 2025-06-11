# Wildfire Backend Render Deployment Guide

## 🚀 Quick Deploy to Render

### Step 1: Prepare Your Repository

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

### Step 2: Deploy on Render

1. **Create Render Account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your wildfire project

3. **Configure Service:**
   ```
   Name: wildfire-backend-api
   Region: Ohio (or closest to your users)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

### Step 3: Environment Variables

Set these in Render Dashboard → Environment tab:

```env
# Required Variables
NODE_ENV=production
PORT=10000
ENABLE_WEBSOCKET=true

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_TABLE_NAME=your_table_name
SNS_TOPIC_ARN=your_sns_topic_arn

# Next.js App URLs
NEXTJS_URL=https://your-nextjs-app.vercel.app
WEBSITE_URL=https://your-domain.com

# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app,https://your-domain.com

# Production Domain
PRODUCTION_DOMAIN=https://your-backend.onrender.com
```

### Step 4: Update Frontend Configurations

#### For Next.js:
```javascript
// next.config.js or env.local
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

#### For React Native:
```javascript
// config/api.js
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001' 
  : 'https://your-backend.onrender.com';

const WS_URL = __DEV__ 
  ? 'ws://localhost:3001' 
  : 'wss://your-backend.onrender.com';
```

### Step 5: Health Check & Testing

1. **Health Check URL:**
   ```
   https://your-backend.onrender.com/health
   ```

2. **Test API Endpoints:**
   ```bash
   # Test basic connection
   curl https://your-backend.onrender.com/

   # Test device data
   curl https://your-backend.onrender.com/api/device/latest

   # Test with client headers
   curl -H "X-Client-Type: nextjs" https://your-backend.onrender.com/api/config
   curl -H "X-Client-Type: react-native" https://your-backend.onrender.com/api/config
   ```

## 🔧 Production Optimizations

### Security Headers
Your server already includes:
- ✅ CORS configuration for both platforms
- ✅ Helmet security headers
- ✅ Rate limiting with platform awareness
- ✅ Request validation

### Performance Features
- ✅ Compression middleware
- ✅ Connection pooling
- ✅ Caching headers
- ✅ Health monitoring

### Monitoring
- ✅ Request logging with Morgan
- ✅ Error tracking
- ✅ Performance metrics
- ✅ Client type detection

## 📱 Platform-Specific Features

### Next.js Integration
```javascript
// lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = {
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'nextjs',
    'X-Client-Version': '1.0.0'
  }
};
```

### React Native Integration
```javascript
// services/api.js
import NetInfo from '@react-native-async-storage/async-storage';

const API_URL = 'https://your-backend.onrender.com';

export const apiClient = {
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'react-native',
    'X-Client-Version': '1.0.0'
  }
};
```

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Add your domain to ALLOWED_ORIGINS
   - Check X-Client-Type header

2. **WebSocket Connection:**
   - Use WSS (not WS) in production
   - Check firewall settings

3. **AWS Permissions:**
   - Verify DynamoDB table access
   - Check SNS topic permissions

4. **Rate Limiting:**
   - Different limits for web vs mobile
   - Check X-Client-Type header

### Debug Endpoints:
```
GET /health - Service health
GET /api/config - Client configuration
GET / - Service info
```

## 🚀 Scaling Options

### Render Plans:
- **Starter**: $7/month - Good for development
- **Standard**: $25/month - Production ready
- **Pro**: $85/month - High traffic

### Auto-scaling Features:
- Automatic deployments
- Zero-downtime deploys
- Health check monitoring
- SSL certificates included

## 📋 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Environment variables configured
- [ ] Health check endpoint working
- [ ] CORS origins updated
- [ ] Frontend URLs updated
- [ ] WebSocket endpoints tested
- [ ] AWS permissions verified
- [ ] SNS webhook configured
- [ ] Mobile app tested
- [ ] Web app tested

## 🔗 Useful URLs

After deployment, you'll have:
```
Main API: https://your-backend.onrender.com
Health: https://your-backend.onrender.com/health
Config: https://your-backend.onrender.com/api/config
Latest Data: https://your-backend.onrender.com/api/device/latest
WebSocket: wss://your-backend.onrender.com
```

Your backend is now ready to serve both your Next.js website and your friend's React Native app! 🎉
