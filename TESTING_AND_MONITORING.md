# Testing and Monitoring Guide

This document provides comprehensive information about testing the DigiKing Telegram Bot and monitoring its performance through the analytics dashboard.

## 🧪 Testing

### Prerequisites

1. **MongoDB Test Database**: Ensure you have a separate MongoDB instance for testing
2. **Environment Variables**: Create a `.env.test` file with test-specific configurations
3. **Dependencies**: Install all dependencies including dev dependencies

```bash
npm install
```

### Test Environment Setup

Create a `.env.test` file with the following variables:

```env
# Test Database
TEST_MONGODB_URL=mongodb://localhost:27017/digiking-test

# Test Bot Token (use a test bot)
TELEGRAM_BOT_TOKEN=your_test_bot_token

# Admin Configuration
ADMIN_IDS=123456789
ADMIN_API_KEY=test_admin_key_123

# Test Email Configuration
EMAIL_FROM=test@digi-king.com
EMAIL_SERVICE_API_KEY=test_key

# Commerce Integration (use test/sandbox URLs)
COMMERCE_WEBHOOK_SECRET=test_webhook_secret
COMMERCE_API_URL=https://sandbox.commerce-platform.com/api

# Rate Limiting (relaxed for testing)
RATE_LIMIT_GENERAL=1000
RATE_LIMIT_SUBSCRIPTION=100
```

### Running Tests

#### Integration Tests

Run the comprehensive integration test suite:

```bash
# Run all integration tests
npm run test:integration

# Run tests with debugging output
DEBUG_TESTS=true npm run test:integration

# Run tests in watch mode
npm run test:watch
```

#### Test Coverage

Generate test coverage reports:

```bash
npm test -- --coverage
```

### Test Categories

#### 1. User Registration and Subscription Flow
- Tests complete subscription workflow
- Validates GDPR compliance
- Checks opt-out functionality
- Verifies user data handling

#### 2. Affiliate System Integration
- Tests affiliate registration
- Validates commission calculations
- Checks sale tracking
- Verifies payout processing

#### 3. Referral System Integration
- Tests referral link generation
- Validates reward processing
- Checks completion tracking
- Verifies referral analytics

#### 4. Email Automation and Campaigns
- Tests scheduled campaigns
- Validates targeting logic
- Checks privacy compliance
- Verifies delivery tracking

#### 5. Commerce Webhook Integration
- Tests order completion handling
- Validates discount usage tracking
- Checks analytics recording
- Verifies commission processing

#### 6. Analytics and KPI Tracking
- Tests conversion funnel metrics
- Validates KPI calculations
- Checks real-time analytics
- Verifies dashboard data

#### 7. Performance and Load Testing
- Tests concurrent request handling
- Validates database performance
- Checks memory usage
- Verifies response times

#### 8. GDPR and Privacy Compliance
- Tests data deletion requests
- Validates privacy preferences
- Checks consent management
- Verifies opt-out handling

## 📊 Analytics Dashboard

### Accessing the Dashboard

The analytics dashboard provides real-time insights into bot performance and user engagement.

#### Local Development

1. **Start the Bot**: Ensure the bot is running
   ```bash
   npm run dev
   ```

2. **Access Dashboard**: Open your browser and navigate to:
   ```
   http://localhost:3000/dashboard
   ```

3. **Authentication**: Enter your admin API key when prompted

#### Production Deployment

1. **Set Environment Variables**: Ensure `ADMIN_API_KEY` is configured
2. **HTTPS Setup**: Dashboard should be served over HTTPS in production
3. **Access Control**: Restrict dashboard access to admin IPs if needed

### Dashboard Features

#### 📈 Key Performance Indicators (KPIs)

- **Subscriber Growth**: Total subscribers and growth rate
- **Email Metrics**: Open rates, click rates, conversion rates
- **Conversion Rate**: End-to-end conversion tracking
- **Revenue Metrics**: Total revenue and average order value
- **Affiliate Performance**: Active affiliates and commission totals
- **Referral Impact**: Total referral rewards and completion rates

#### 📊 Interactive Charts

- **Subscriber Growth**: Daily subscriber acquisition trends
- **Conversion Funnel**: Step-by-step user journey analysis
- **Revenue Analytics**: Daily revenue and order volume
- **GDPR Compliance**: Consent rates and opt-out tracking

#### 🔧 Dashboard Controls

- **Time Period Selection**: 7 days, 30 days, 90 days, 1 year
- **Real-time Updates**: Auto-refresh every 5 minutes
- **Export Functionality**: Download reports (planned feature)
- **Alert Configuration**: Set up performance alerts (planned feature)

### API Endpoints

The dashboard consumes data from the following API endpoints:

#### Analytics Endpoints

- `GET /api/analytics/kpis?period=30d` - Comprehensive KPI data
- `GET /api/analytics/subscriber-growth?period=30d` - Subscriber growth over time
- `GET /api/analytics/conversion-funnel?period=30d` - Conversion funnel analysis
- `GET /api/analytics/revenue?period=30d` - Revenue analytics
- `POST /api/analytics/track` - Track custom events

#### Campaign Management

- `POST /api/campaigns/execute` - Execute email campaigns
- `GET /api/campaigns/stats` - Campaign performance statistics

#### GDPR Compliance

- `POST /api/gdpr/delete-user-data` - Delete user data (GDPR right to be forgotten)
- `GET /api/gdpr/compliance-report` - Generate compliance reports

### Security Considerations

#### API Authentication

- All admin endpoints require `X-Admin-Key` header
- API key should be stored securely and rotated regularly
- Consider implementing IP whitelist for admin access

#### Data Privacy

- Dashboard respects user privacy preferences
- Personal data is anonymized in analytics
- GDPR compliance is maintained throughout

#### Rate Limiting

- API endpoints implement rate limiting
- Prevent abuse and ensure system stability
- Monitor for unusual access patterns

## 🚀 Deployment and Monitoring

### Production Checklist

#### Pre-deployment

- [ ] Run full integration test suite
- [ ] Verify all environment variables are set
- [ ] Test webhook endpoints with sandbox data
- [ ] Validate database connections and indexes
- [ ] Check GDPR compliance implementation

#### Post-deployment

- [ ] Monitor bot startup and health endpoints
- [ ] Verify webhook reception and processing
- [ ] Test dashboard access and authentication
- [ ] Check email campaign functionality
- [ ] Monitor performance metrics and error logs

### Ongoing Monitoring

#### Key Metrics to Monitor

1. **System Health**
   - Bot uptime and response times
   - Database performance and connection pool
   - Memory usage and CPU utilization
   - Error rates and exception logs

2. **Business Metrics**
   - Daily active users and new signups
   - Subscription conversion rates
   - Email engagement rates
   - Revenue and order volumes
   - Affiliate and referral performance

3. **Compliance Metrics**
   - GDPR consent rates
   - Data processing compliance
   - Opt-out processing times
   - Privacy request handling

#### Alerting Setup

Recommended alerts to configure:

- **High Priority**
  - Bot downtime or health check failures
  - Database connection issues
  - Webhook processing failures
  - GDPR compliance violations

- **Medium Priority**
  - Unusual drop in conversion rates
  - Email delivery issues
  - Performance degradation
  - High error rates

- **Low Priority**
  - Daily/weekly summary reports
  - Growth milestone notifications
  - Feature usage analytics

### Troubleshooting

#### Common Issues

1. **Test Failures**
   - Ensure test database is running and accessible
   - Check that all required environment variables are set
   - Verify bot token is valid for testing

2. **Dashboard Access Issues**
   - Verify admin API key is correct
   - Check that bot server is running
   - Ensure dashboard files are served correctly

3. **Webhook Issues**
   - Verify webhook URLs are accessible
   - Check webhook secret configuration
   - Monitor webhook processing logs

4. **Performance Issues**
   - Check database indexes and query performance
   - Monitor memory usage and connection pools
   - Review rate limiting configuration

#### Debugging Tools

- **Logs**: Enable debug logging with `DEBUG_TESTS=true`
- **Database**: Use MongoDB Compass for database inspection
- **Network**: Use tools like ngrok for webhook testing
- **Performance**: Monitor with tools like PM2 or New Relic

## 📝 Maintenance

### Regular Tasks

- **Weekly**: Review dashboard metrics and performance
- **Monthly**: Run full integration tests and security audit
- **Quarterly**: Update dependencies and security patches
- **Annually**: Comprehensive system review and optimization

### Data Retention

- **Analytics Data**: Retain for 2 years for trend analysis
- **User Data**: Follow GDPR guidelines and user preferences
- **Logs**: Retain system logs for 90 days
- **Backups**: Daily database backups with 30-day retention

For additional support or questions, refer to the main README.md or contact the development team.

