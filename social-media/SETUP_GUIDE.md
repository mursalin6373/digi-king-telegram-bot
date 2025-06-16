# Digi-King Social Media Setup Guide

This guide will help you set up and configure the complete social media automation system for Digi-King.

## Prerequisites

### Required Accounts
1. **Instagram Business Account** (converted from personal)
2. **Twitter Developer Account** with API access
3. **LinkedIn Company Page** with API access
4. **Facebook Business Page** with API access
5. **Telegram Channel** (public)
6. **Buffer Account** (for scheduling)

### Required Tools
- Node.js 16+
- Git
- Text editor
- Image editing software (Canva, Photoshop, etc.)

---

## Step 1: Social Media Account Setup

### Instagram Business Account
1. Convert personal account to business account
2. Connect to Facebook Business Manager
3. Get Instagram Business Account ID:
   ```bash
   curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_ACCESS_TOKEN"
   ```

### Twitter Developer Account
1. Apply for Twitter Developer account at developer.twitter.com
2. Create a new app
3. Generate API keys and Bearer Token
4. Enable OAuth 2.0

### LinkedIn Company Page
1. Create LinkedIn Company Page
2. Apply for LinkedIn Marketing API access
3. Generate access tokens through LinkedIn Developer Portal

### Facebook Business Page
1. Create Facebook Business Page
2. Connect to Business Manager
3. Generate Page Access Token through Graph API Explorer

### Telegram Channel
1. Create public Telegram channel: @digi_king_updates
2. Get channel ID using getUpdates API
3. Add your bot as administrator

---

## Step 2: API Keys and Tokens

### Buffer API Setup
1. Sign up for Buffer business account
2. Go to Buffer Developers: https://buffer.com/developers
3. Create new app and get API credentials
4. Connect all social media accounts to Buffer
5. Get profile IDs for each connected account

### Facebook/Instagram API
1. Go to Facebook Developers: https://developers.facebook.com
2. Create new app
3. Add Instagram Graph API product
4. Generate long-lived access tokens

### Twitter API v2
1. Go to Twitter Developer Portal
2. Create project and app
3. Generate Bearer Token and API keys
4. Enable read/write permissions

### LinkedIn API
1. Go to LinkedIn Developer Portal
2. Create new app
3. Request Marketing API access
4. Generate access tokens

---

## Step 3: Environment Configuration

Create `.env.social` file in the project root:

```bash
# Social Media API Keys

# Buffer API
BUFFER_ACCESS_TOKEN=your_buffer_access_token
BUFFER_INSTAGRAM_PROFILE_ID=your_instagram_profile_id
BUFFER_TWITTER_PROFILE_ID=your_twitter_profile_id
BUFFER_LINKEDIN_PROFILE_ID=your_linkedin_profile_id
BUFFER_FACEBOOK_PROFILE_ID=your_facebook_profile_id

# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_id

# Twitter API v2
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# LinkedIn API
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_COMPANY_ID=your_linkedin_company_id

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_PAGE_ID=your_facebook_page_id

# Telegram Channel
TELEGRAM_CHANNEL_ID=@digi_king_updates
# Note: TELEGRAM_BOT_TOKEN is already in main .env file

# Brand Settings
BRAND_NAME=Digi-King
BRAND_WEBSITE=https://your-store-url.com
BRAND_SUPPORT_EMAIL=support@digi-king.com
```

---

## Step 4: Brand Asset Preparation

### Logo Files Needed
- **Instagram:** 1080x1080px (profile), 1080x1920px (stories)
- **Twitter:** 400x400px (profile), 1500x500px (header)
- **LinkedIn:** 300x300px (profile), 1584x396px (cover)
- **Facebook:** 170x170px (profile), 1200x630px (cover)
- **Telegram:** 512x512px

### Color Palette
- Primary Blue: #1E40AF
- Primary Green: #059669
- Accent Red: #DC2626
- Light Gray: #F3F4F6
- Dark Gray: #111827

### Content Templates
Create branded templates for:
- Instagram posts (1080x1080px)
- Instagram stories (1080x1920px)
- Twitter posts (1200x675px for images)
- LinkedIn posts (1200x627px)
- Facebook posts (1200x630px)

---

## Step 5: Installation and Setup

### Install Dependencies
```bash
cd digi-king-telegram-bot
npm install
```

### Load Environment Variables
Add to your main `.env` file:
```bash
# Source social media environment
source .env.social
```

### Initialize Content Library
```bash
# The content_library.json is already created with sample content
# Customize it for your brand and products
```

### Test API Connections
```bash
node social-media/automation/test_connections.js
```

---

## Step 6: Profile Setup

### Update Profile Information
Use the templates in `BRAND_PROFILES.md` to set up each platform:

1. **Instagram (@digi_king_official)**
   - Bio with emojis and clear value proposition
   - Link to Linktree or main store
   - Business category and contact info
   - Story highlights for key topics

2. **Twitter (@DigiKingOfficial)**
   - Professional bio with keywords
   - Header image with brand messaging
   - Pinned tweet with welcome message
   - Location and website link

3. **LinkedIn (Digi-King Solutions)**
   - Complete company information
   - Professional cover image
   - Detailed about section
   - Industry and company size

4. **Facebook (Digi-King)**
   - Business page setup
   - Call-to-action button
   - Business hours and contact info
   - Shop section if applicable

5. **Telegram (@digi_king_updates)**
   - Channel description with value proposition
   - Channel photo and links
   - Admin settings configuration

### Cross-Platform Linking
Ensure all platforms link to:
- Main store/website
- Telegram bot (@digi_king_bot)
- Newsletter signup
- Support channels

---

## Step 7: Content Library Setup

### Customize Content Templates
Edit `social-media/automation/content_library.json`:

1. Replace placeholder URLs with actual asset URLs
2. Update brand-specific messaging
3. Add your actual customer testimonials
4. Include real product information
5. Update company milestones and achievements

### Asset Organization
Organize your content assets:
```
social-media/
├── assets/
│   ├── graphics/
│   │   ├── instagram/
│   │   ├── twitter/
│   │   ├── linkedin/
│   │   ├── facebook/
│   │   └── telegram/
│   ├── videos/
│   ├── templates/
│   └── logos/
└── content/
    ├── captions/
    ├── hashtags/
    └── campaigns/
```

---

## Step 8: Automation Setup

### Start Social Media Scheduler
```bash
# Run the social media scheduler
node social-media/automation/social_media_scheduler.js
```

### Verify Scheduled Posts
1. Check Buffer dashboard for queued posts
2. Verify posting times are correct for your timezone
3. Test emergency posting functionality

### Analytics Setup
```bash
# Run analytics collection
node social-media/automation/analytics_tracker.js
```

---

## Step 9: Monitoring and Optimization

### Daily Tasks
- [ ] Check scheduled posts went live
- [ ] Respond to comments and messages
- [ ] Monitor mentions and hashtags
- [ ] Share relevant industry content
- [ ] Update stories on Instagram

### Weekly Tasks
- [ ] Generate analytics report
- [ ] Review top-performing content
- [ ] Plan next week's content
- [ ] Update content library
- [ ] Analyze competitor activity

### Monthly Tasks
- [ ] Comprehensive performance review
- [ ] Update brand profiles and bios
- [ ] Plan campaign themes
- [ ] Review and update automation settings
- [ ] Optimize posting schedules

---

## Step 10: Content Creation Workflow

### Content Planning
1. Use the 30-day content calendar as a template
2. Plan content around product launches and promotions
3. Include seasonal and trending topics
4. Balance promotional and educational content

### Content Creation Process
1. **Monday:** Plan week's content and create graphics
2. **Tuesday:** Write captions and schedule posts
3. **Wednesday:** Create video content and stories
4. **Thursday:** Review and approve scheduled content
5. **Friday:** Prepare weekend and next week's content

### Quality Control
- [ ] All links are working and tracked
- [ ] Images are properly sized for each platform
- [ ] Captions include relevant hashtags
- [ ] Call-to-actions are clear and compelling
- [ ] Brand voice is consistent across platforms

---

## Troubleshooting

### Common Issues

**API Rate Limits:**
- Instagram: 200 calls per hour
- Twitter: 300 requests per 15 minutes
- Facebook: 200 calls per hour per user
- LinkedIn: 100 calls per day

**Failed Posts:**
1. Check API credentials
2. Verify account permissions
3. Check content compliance with platform policies
4. Review image/video format requirements

**Low Engagement:**
1. Review posting times
2. Analyze content performance
3. Increase interaction with followers
4. Use more relevant hashtags
5. Post more video content

### Support Resources
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [LinkedIn Marketing API](https://docs.microsoft.com/en-us/linkedin/marketing/)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Buffer API Documentation](https://buffer.com/developers/api)

---

## Security Best Practices

### API Key Security
- Never commit API keys to version control
- Use environment variables for all credentials
- Rotate access tokens regularly
- Monitor API usage for unusual activity
- Use least-privilege access principles

### Account Security
- Enable 2FA on all social media accounts
- Use strong, unique passwords
- Limit admin access to necessary team members
- Regularly audit connected apps and permissions
- Monitor account activity logs

---

## Performance Optimization

### Content Optimization
- A/B test different post types
- Analyze optimal posting times
- Use platform-specific features (Stories, Reels, etc.)
- Engage with comments within 2-4 hours
- Cross-promote content across platforms

### Automation Optimization
- Monitor automation performance
- Adjust posting schedules based on analytics
- Update content library regularly
- Test emergency posting procedures
- Optimize for peak engagement times

---

## Success Metrics

### Key Performance Indicators (KPIs)
- **Growth:** Follower count increase
- **Engagement:** Likes, comments, shares, saves
- **Reach:** Unique users who see content
- **Traffic:** Click-through rates to website
- **Conversions:** Sales from social media
- **Brand Awareness:** Mentions and hashtag usage

### Reporting Schedule
- **Daily:** Basic engagement monitoring
- **Weekly:** Performance summary and adjustments
- **Monthly:** Comprehensive analytics report
- **Quarterly:** Strategy review and planning

This setup guide provides a comprehensive foundation for your social media automation system. Regular monitoring and optimization will ensure continued success and growth across all platforms.

