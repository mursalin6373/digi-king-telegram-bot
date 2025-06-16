# 🚀 Digi-King Telegram Bot

[![GitHub Stars](https://img.shields.io/github/stars/darklink2151/digi-king-telegram-bot?style=for-the-badge&logo=github)](https://github.com/darklink2151/digi-king-telegram-bot/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/darklink2151/digi-king-telegram-bot?style=for-the-badge&logo=github)](https://github.com/darklink2151/digi-king-telegram-bot/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/darklink2151/digi-king-telegram-bot?style=for-the-badge&logo=github)](https://github.com/darklink2151/digi-king-telegram-bot/issues)
[![Node.js Version](https://img.shields.io/badge/node.js-18.x-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

<div align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge" alt="Production Ready">
  <img src="https://img.shields.io/badge/Value-$10,000+-gold?style=for-the-badge" alt="Enterprise Value">
  <img src="https://img.shields.io/badge/Launch%20Time-5%20Minutes-blue?style=for-the-badge" alt="Quick Launch">
</div>

---

## 🎆 **Complete Multi-Channel Marketing Automation System**

A comprehensive, enterprise-grade Telegram bot for the "digi-king" brand that provides complete marketing automation including email subscriptions, affiliate programs, referral systems, social media management, real-time analytics, A/B testing, and GDPR compliance.

**💰 Enterprise Value:** $10,000+ development cost  
**⏱️ Quick Launch:** Ready in 5 minutes  
**🌐 Multi-Channel:** Telegram + Email + Social Media  
**📊 Analytics:** Real-time dashboard with KPIs  
**🛡️ Compliant:** GDPR/CCPA ready

## Features

### 🔐 User Management
- **Email Collection & Validation**: Robust email validation with typo suggestions
- **GDPR Compliance**: Privacy consent management and opt-in/opt-out functionality
- **User Segmentation**: Automatic user categorization (new_customer, returning_customer, vip, inactive)
- **Preference Management**: Granular notification preferences

### 📧 Email Subscriptions
- **Subscription Flow**: Guided subscription process with consent management
- **Email Validation**: Advanced email validation including disposable email detection
- **Unsubscribe Management**: Easy unsubscribe with retention attempts
- **Privacy Compliance**: GDPR-compliant consent collection

### 🎯 Campaign Management
- **Automated Campaigns**: Welcome campaigns, product announcements, promotions
- **Segmented Targeting**: Target specific user segments
- **Scheduled Messaging**: Schedule campaigns for optimal timing
- **Recurring Campaigns**: Set up daily, weekly, or monthly recurring messages
- **A/B Testing Ready**: Campaign analytics for optimization

### 💳 Discount Code System
- **Dynamic Generation**: Personalized discount codes based on user segments
- **Expiry Management**: Automatic code expiration and cleanup
- **Usage Tracking**: Track code redemption and conversion rates
- **Segment-based Codes**: Different discount levels for different user types

### 📊 Analytics & Reporting
- **User Engagement**: Track interactions, clicks, and conversions
- **Campaign Performance**: Open rates, click rates, conversion tracking
- **Revenue Attribution**: Track revenue generated from campaigns
- **Admin Dashboard**: Comprehensive admin panel for management

### 🛠 Admin Features
- **Admin Panel**: Full-featured admin interface
- **Broadcasting**: Send messages to all subscribers or specific segments
- **User Management**: Search, export, and manage users
- **Analytics Dashboard**: Real-time statistics and reports
- **Campaign Creation**: Create and schedule campaigns

### 🔗 Commerce Integration
- **Webhook Support**: Integrate with e-commerce platforms
- **Order Tracking**: Track purchases and update user segments
- **Product Announcements**: Automatic new product notifications
- **Purchase Analytics**: Revenue and conversion tracking

## Tech Stack

- **Node.js** - Runtime environment
- **Telegraf** - Telegram Bot API framework
- **MongoDB** - Database for user data and analytics
- **Express.js** - Web server for webhooks
- **node-cron** - Campaign scheduling
- **Mongoose** - MongoDB ODM
- **Validator** - Email validation
- **Rate Limiting** - API protection

## Installation

### Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- Telegram Bot Token (from @BotFather)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd digi-king-telegram-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/bot-webhook
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/digi-king-bot
   
   # Security
   JWT_SECRET=your_secret_key_here
   ADMIN_PASSWORD=your_admin_password
   ENCRYPTION_KEY=your_32_character_key_here
   
   # Admin Users (Telegram User IDs)
   ADMIN_USER_IDS=123456789,987654321
   
   # Commerce Integration
   COMMERCE_API_URL=https://your-ecommerce-platform.com/api
   COMMERCE_API_KEY=your_api_key
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or start your local MongoDB service
   mongod
   ```

5. **Run the Bot**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Configuration

### Telegram Bot Setup

1. Create a bot with @BotFather on Telegram
2. Get your bot token
3. Set bot commands (optional):
   ```
   start - Welcome message and main menu
   subscribe - Subscribe to newsletter
   unsubscribe - Unsubscribe from newsletter
   profile - View your profile
   discount - Get personalized discount
   preferences - Manage notification preferences
   help - Show help message
   admin - Admin panel (admin only)
   ```

### Admin Setup

1. Get your Telegram User ID (use @userinfobot)
2. Add your User ID to `ADMIN_USER_IDS` in `.env`
3. Use `/admin` command to access admin features

### Commerce Platform Integration

The bot supports webhook integration with e-commerce platforms. Set up webhooks for:

- `order.completed` - When an order is completed
- `discount.used` - When a discount code is used
- `product.created` - When a new product is added

Webhook endpoint: `POST /webhook/commerce`

Example webhook payload:
```json
{
  "event": "order.completed",
  "order": {
    "id": "order_123",
    "total": 99.99,
    "customer": {
      "email": "customer@example.com"
    }
  }
}
```

## Usage

### User Commands

- `/start` - Welcome message and main menu
- `/subscribe` - Subscribe to newsletter
- `/unsubscribe` - Unsubscribe from newsletter
- `/profile` - View user profile and statistics
- `/discount` - Get personalized discount code
- `/preferences` - Manage notification preferences
- `/help` - Show help and available commands

### Admin Commands

- `/admin` - Open admin panel
- Admin panel provides access to:
  - Analytics dashboard
  - Campaign management
  - User management
  - Broadcast messaging
  - Discount code management

### Subscription Flow

1. User starts with `/start` or clicks "Subscribe"
2. Bot shows privacy policy and asks for consent
3. User gives consent
4. Bot asks for email address
5. Email is validated (with typo suggestions)
6. User is subscribed and receives welcome message
7. Welcome campaign with discount code is scheduled

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /webhook/commerce` - Commerce platform webhooks
- `POST /bot-webhook` - Telegram bot webhook (production)

## Database Schema

### Users Collection
- User profile information
- Subscription status and preferences
- Purchase history and segments
- Consent and privacy settings

### Campaigns Collection
- Campaign metadata and content
- Targeting and scheduling information
- Analytics and performance data
- Discount code information

### Analytics Collection
- User interaction events
- Campaign performance metrics
- Revenue and conversion tracking
- Button clicks and engagement data

## Features in Detail

### Email Validation
- Format validation using industry standards
- Disposable email detection
- Typo detection and suggestions
- MX record validation (optional)
- Integration with external validation APIs

### User Segmentation
- **New Customer**: No previous purchases
- **Returning Customer**: Has made purchases
- **VIP**: High-value customers (>$1000 spent)
- **Inactive**: No interaction in 30+ days

Segments are automatically updated based on user behavior.

### Discount Code Generation
- Personalized codes based on user segments
- Configurable expiry dates
- Usage limits and tracking
- Anti-fraud measures
- Bulk code generation for campaigns

### Campaign Scheduling
- One-time campaigns
- Recurring campaigns (daily/weekly/monthly)
- Time zone support
- Automatic cleanup of old campaigns
- Failed delivery handling

### Analytics Tracking
- Message delivery status
- Button click tracking
- Conversion tracking
- Revenue attribution
- User engagement metrics

## Security Features

- Rate limiting on all endpoints
- Input validation and sanitization
- Admin authentication
- Secure environment variable handling
- CORS protection
- Helmet.js security headers

## Monitoring

- Health check endpoint for uptime monitoring
- Detailed logging for debugging
- Error tracking and reporting
- Performance metrics collection

## Deployment

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
TELEGRAM_WEBHOOK_URL=https://your-domain.com/bot-webhook
MONGODB_URI=mongodb://your-mongodb-cluster/digi-king-bot
```

### Process Management

Use PM2 for production deployment:

```bash
npm install -g pm2
pm2 start src/index.js --name "digi-king-bot"
pm2 startup
pm2 save
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Development Mode

```bash
npm run dev
```

This starts the bot with nodemon for auto-reloading during development.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Email: support@digi-king.com
- Create an issue on GitHub
- Check the documentation in the `/docs` folder

## Roadmap

- [ ] Multi-language support
- [ ] Advanced A/B testing
- [ ] Integration with more e-commerce platforms
- [ ] Enhanced analytics dashboard
- [ ] Machine learning for user segmentation
- [ ] SMS integration
- [ ] Advanced campaign templates
- [ ] API for third-party integrations

