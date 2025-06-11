# Wildfire Device Data Backend

This is the Node.js + Express backend API for the wildfire device data system. It supports both Next.js websites and React Native mobile apps.

## Features

- ✅ **DynamoDB Integration** - Connect to your existing DynamoDB table
- ✅ **Multi-Platform Support** - Works with Next.js and React Native
- ✅ **Real-time Updates** - WebSocket support for live data
- ✅ **Platform Detection** - Automatic client type detection and optimization
- ✅ **Rate Limiting** - Different limits for web and mobile clients
- ✅ **Analytics** - Built-in analytics and dashboard endpoints
- ✅ **Error Handling** - Comprehensive error handling and logging

## Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your AWS credentials
nano .env
```

### 3. Update .env File
Replace these values with your actual credentials:
```bash
AWS_ACCESS_KEY_ID=AKIA...your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
DYNAMODB_TABLE_NAME=your_actual_table_name
```

### 4. Test DynamoDB Connection
```bash
npm run test
```

### 5. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `AWS_REGION` | AWS region | us-east-1 |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name | Required |
| `TIMESTAMP_FIELD` | Timestamp field name in your table | timestamp |
| `DEVICE_ID_FIELD` | Device ID field name in your table | deviceId |
| `DEFAULT_DEVICE_ID` | Default device ID | device_001 |
| `ENABLE_WEBSOCKET` | Enable WebSocket support | true |

## API Endpoints

### Health & Info
- `GET /health` - Server health check
- `GET /api/config` - Client configuration

### Device Data
- `GET /api/device/latest` - Get latest record
- `GET /api/device/data` - Get paginated device data
- `GET /api/device/:deviceId` - Get data for specific device
- `GET /api/device/list` - Get list of all devices
- `GET /api/device/health/db` - Test database connection

### Analytics
- `GET /api/analytics/summary` - Get analytics summary
- `GET /api/analytics/dashboard` - Get dashboard data

### Client-Specific
- `GET /api/client/info` - Get client capabilities
- `GET /api/client/optimized-data` - Get optimized data for client type

## WebSocket Events

### Client -> Server
- `subscribe-device` - Subscribe to device updates
- `unsubscribe-device` - Unsubscribe from device updates
- `request-latest` - Request latest data
- `request-analytics` - Request analytics data
- `ping` - Health check ping

### Server -> Client
- `connected` - Connection established
- `latest-data` - Latest data update
- `device-update` - Device-specific update
- `new-data` - New data broadcast
- `system-alert` - System alerts
- `pong` - Ping response

## Platform Support

### Next.js Integration
The API automatically detects Next.js clients and provides:
- Full data structures
- SEO-friendly responses
- Server-side rendering support

### React Native Integration
The API automatically detects React Native clients and provides:
- Compressed data payloads
- Mobile-optimized responses
- Higher rate limits for mobile apps

## Deployment

### AWS EC2 Deployment
1. Launch EC2 instance
2. Install Node.js and dependencies
3. Clone repository
4. Configure environment variables
5. Use PM2 for process management
6. Setup Nginx for reverse proxy
7. Configure SSL certificate

### Heroku Deployment
1. Install Heroku CLI
2. Create Heroku app
3. Set environment variables via Heroku config
4. Deploy via Git push

## Testing

### Test DynamoDB Connection
```bash
node test-connection.js
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Latest data
curl http://localhost:3001/api/device/latest

# Device list
curl http://localhost:3001/api/device/list
```

## Troubleshooting

### Common Issues

1. **DynamoDB Connection Failed**
   - Check AWS credentials
   - Verify table name
   - Check IAM permissions

2. **CORS Issues**
   - Update `ALLOWED_ORIGINS` in .env
   - Check client headers

3. **WebSocket Connection Failed**
   - Check firewall settings
   - Verify WebSocket is enabled

### Logs
```bash
# View PM2 logs
pm2 logs device-api

# View application logs
tail -f logs/app.log
```

## Development

### File Structure
```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example           # Environment template
├── test-connection.js     # DynamoDB test script
├── routes/                # API routes
│   ├── deviceRoutes.js
│   ├── analyticsRoutes.js
│   └── clientRoutes.js
├── middleware/            # Express middleware
│   ├── clientDetection.js
│   └── errorHandler.js
├── services/              # Business logic
│   └── dynamodbService.js
├── utils/                 # Utilities
│   └── logger.js
└── websocket/             # WebSocket handlers
    └── socketHandler.js
```

### Adding New Endpoints
1. Create route in appropriate file in `/routes`
2. Add business logic to `/services`
3. Update documentation

## Security

- Rate limiting enabled
- CORS configured
- Input validation
- Error message sanitization
- Environment-based configuration

## Support

For issues or questions:
1. Check the logs for error details
2. Verify environment configuration
3. Test DynamoDB connection
4. Check AWS IAM permissions