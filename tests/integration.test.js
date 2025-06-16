const request = require('supertest');
const mongoose = require('mongoose');
const { DigiKingBot } = require('../src/index');
const User = require('../src/models/User');
const Affiliate = require('../src/models/Affiliate');
const Referral = require('../src/models/Referral');
const Analytics = require('../src/models/Analytics');
const Campaign = require('../src/models/Campaign');
const DiscountCode = require('../src/models/DiscountCode');

describe('DigiKing Bot Integration Tests', () => {
  let bot;
  let app;
  let testUser;
  let testAffiliate;

  beforeAll(async () => {
    // Connect to test database
    const testDbUrl = process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/digiking-test';
    await mongoose.connect(testDbUrl);
    
    // Initialize bot with test configuration
    bot = new DigiKingBot();
    await bot.initialize();
    app = bot.app;
  });

  beforeEach(async () => {
    // Clean test data before each test
    await User.deleteMany({});
    await Affiliate.deleteMany({});
    await Referral.deleteMany({});
    await Analytics.deleteMany({});
    await Campaign.deleteMany({});
    await DiscountCode.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('User Registration and Subscription Flow', () => {
    test('should handle complete subscription flow with GDPR compliance', async () => {
      const telegramUserId = 12345;
      const userData = {
        telegram_id: telegramUserId,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        gdpr_consent: true,
        email_notifications: true,
        data_processing_consent: true
      };

      // Simulate /start command
      const startResponse = await request(app)
        .post('/webhook')
        .send({
          message: {
            from: { id: telegramUserId, username: 'testuser', first_name: 'Test', last_name: 'User' },
            text: '/start',
            chat: { id: telegramUserId }
          }
        });

      expect(startResponse.status).toBe(200);

      // Check user was created with default preferences
      const user = await User.findOne({ telegram_id: telegramUserId });
      expect(user).toBeTruthy();
      expect(user.gdpr_consent).toBe(true);
      expect(user.email_notifications).toBe(true);

      // Simulate subscription with email
      const subscribeResponse = await request(app)
        .post('/webhook')
        .send({
          message: {
            from: { id: telegramUserId },
            text: '/subscribe test@example.com',
            chat: { id: telegramUserId }
          }
        });

      expect(subscribeResponse.status).toBe(200);

      // Verify user subscription status
      const subscribedUser = await User.findOne({ telegram_id: telegramUserId });
      expect(subscribedUser.email).toBe('test@example.com');
      expect(subscribedUser.subscription_status).toBe('active');
    });

    test('should handle GDPR opt-out request', async () => {
      const telegramUserId = 54321;
      
      // Create user first
      const user = new User({
        telegram_id: telegramUserId,
        email: 'optout@example.com',
        gdpr_consent: true,
        email_notifications: true
      });
      await user.save();

      // Simulate opt-out request
      const optOutResponse = await request(app)
        .post('/webhook')
        .send({
          message: {
            from: { id: telegramUserId },
            text: '/privacy optout',
            chat: { id: telegramUserId }
          }
        });

      expect(optOutResponse.status).toBe(200);

      // Verify opt-out was processed
      const updatedUser = await User.findOne({ telegram_id: telegramUserId });
      expect(updatedUser.gdpr_consent).toBe(false);
      expect(updatedUser.email_notifications).toBe(false);
    });
  });

  describe('Affiliate System Integration', () => {
    test('should handle affiliate registration and commission tracking', async () => {
      const affiliateUserId = 67890;
      
      // Create base user
      const user = new User({
        telegram_id: affiliateUserId,
        email: 'affiliate@example.com',
        gdpr_consent: true
      });
      await user.save();

      // Simulate affiliate registration
      const affiliateResponse = await request(app)
        .post('/webhook')
        .send({
          message: {
            from: { id: affiliateUserId },
            text: '/affiliate register',
            chat: { id: affiliateUserId }
          }
        });

      expect(affiliateResponse.status).toBe(200);

      // Verify affiliate was created
      const affiliate = await Affiliate.findOne({ user_id: affiliateUserId });
      expect(affiliate).toBeTruthy();
      expect(affiliate.affiliate_code).toBeTruthy();
      expect(affiliate.commission_rate).toBeGreaterThan(0);

      // Simulate affiliate sale webhook
      const saleData = {
        affiliate_code: affiliate.affiliate_code,
        sale_amount: 100.00,
        customer_email: 'customer@example.com',
        product_id: 'test-product-123'
      };

      const saleResponse = await request(app)
        .post('/webhook/affiliate-sale')
        .send(saleData);

      expect(saleResponse.status).toBe(200);

      // Verify commission was calculated and recorded
      const updatedAffiliate = await Affiliate.findOne({ user_id: affiliateUserId });
      expect(updatedAffiliate.total_sales).toBe(100.00);
      expect(updatedAffiliate.total_commission).toBeGreaterThan(0);
    });
  });

  describe('Referral System Integration', () => {
    test('should process referral rewards correctly', async () => {
      const referrerId = 11111;
      const referredId = 22222;

      // Create referrer
      const referrer = new User({
        telegram_id: referrerId,
        email: 'referrer@example.com',
        gdpr_consent: true
      });
      await referrer.save();

      // Simulate referral link usage
      const referralResponse = await request(app)
        .post('/webhook')
        .send({
          message: {
            from: { id: referredId, username: 'referred_user' },
            text: '/start ref_' + referrerId,
            chat: { id: referredId }
          }
        });

      expect(referralResponse.status).toBe(200);

      // Verify referral was recorded
      const referral = await Referral.findOne({ referrer_id: referrerId, referred_id: referredId });
      expect(referral).toBeTruthy();
      expect(referral.status).toBe('pending');

      // Simulate referred user making purchase
      const purchaseResponse = await request(app)
        .post('/webhook/order-complete')
        .send({
          user_id: referredId,
          order_amount: 50.00,
          order_id: 'order-123'
        });

      expect(purchaseResponse.status).toBe(200);

      // Verify referral reward was processed
      const completedReferral = await Referral.findOne({ referrer_id: referrerId, referred_id: referredId });
      expect(completedReferral.status).toBe('completed');
      expect(completedReferral.reward_amount).toBeGreaterThan(0);
    });
  });

  describe('Email Automation and Campaign Testing', () => {
    test('should handle scheduled email campaigns', async () => {
      // Create test users for campaign
      const users = [
        { telegram_id: 1001, email: 'user1@example.com', gdpr_consent: true, email_notifications: true },
        { telegram_id: 1002, email: 'user2@example.com', gdpr_consent: true, email_notifications: true },
        { telegram_id: 1003, email: 'user3@example.com', gdpr_consent: false, email_notifications: false }
      ];

      for (const userData of users) {
        const user = new User(userData);
        await user.save();
      }

      // Create test campaign
      const campaign = new Campaign({
        name: 'Test Campaign',
        subject: 'Test Subject',
        content: 'Test campaign content',
        target_audience: 'all_subscribers',
        scheduled_date: new Date(),
        status: 'scheduled'
      });
      await campaign.save();

      // Simulate campaign execution
      const campaignResponse = await request(app)
        .post('/api/campaigns/execute')
        .send({ campaign_id: campaign._id });

      expect(campaignResponse.status).toBe(200);

      // Verify campaign was executed and compliance was respected
      const updatedCampaign = await Campaign.findById(campaign._id);
      expect(updatedCampaign.status).toBe('sent');
      expect(updatedCampaign.sent_count).toBe(2); // Only users with consent
    });
  });

  describe('Commerce Webhook Integration', () => {
    test('should handle order completion webhook', async () => {
      const userId = 33333;
      const user = new User({
        telegram_id: userId,
        email: 'buyer@example.com',
        gdpr_consent: true
      });
      await user.save();

      const orderData = {
        user_id: userId,
        order_id: 'order-789',
        order_amount: 199.99,
        products: ['digital-course-1', 'bonus-material'],
        payment_status: 'completed'
      };

      const orderResponse = await request(app)
        .post('/webhook/order-complete')
        .send(orderData);

      expect(orderResponse.status).toBe(200);

      // Verify analytics were recorded
      const analytics = await Analytics.findOne({ 
        user_id: userId, 
        event_type: 'purchase' 
      });
      expect(analytics).toBeTruthy();
      expect(analytics.event_data.order_amount).toBe(199.99);
    });

    test('should handle discount code usage', async () => {
      // Create discount code
      const discountCode = new DiscountCode({
        code: 'TEST20',
        discount_percentage: 20,
        max_uses: 100,
        current_uses: 0,
        active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      await discountCode.save();

      const discountData = {
        code: 'TEST20',
        user_id: 44444,
        order_amount: 100.00,
        discount_amount: 20.00
      };

      const discountResponse = await request(app)
        .post('/webhook/discount-used')
        .send(discountData);

      expect(discountResponse.status).toBe(200);

      // Verify discount usage was tracked
      const updatedCode = await DiscountCode.findOne({ code: 'TEST20' });
      expect(updatedCode.current_uses).toBe(1);
    });
  });

  describe('Analytics and KPI Tracking', () => {
    test('should track conversion funnel metrics', async () => {
      const userId = 55555;
      
      // Simulate funnel events
      const events = [
        { event_type: 'bot_start', user_id: userId },
        { event_type: 'email_subscribe', user_id: userId },
        { event_type: 'affiliate_view', user_id: userId },
        { event_type: 'purchase', user_id: userId, event_data: { order_amount: 150.00 } }
      ];

      for (const event of events) {
        const analyticsResponse = await request(app)
          .post('/api/analytics/track')
          .send(event);
        expect(analyticsResponse.status).toBe(200);
      }

      // Verify all events were recorded
      const userAnalytics = await Analytics.find({ user_id: userId });
      expect(userAnalytics).toHaveLength(4);

      // Test KPI calculation endpoint
      const kpiResponse = await request(app)
        .get('/api/analytics/kpis')
        .query({ period: '7d' });

      expect(kpiResponse.status).toBe(200);
      expect(kpiResponse.body).toHaveProperty('subscriber_growth');
      expect(kpiResponse.body).toHaveProperty('conversion_rate');
      expect(kpiResponse.body).toHaveProperty('affiliate_impact');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent webhook requests', async () => {
      const concurrentRequests = 10;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const request_promise = request(app)
          .post('/webhook')
          .send({
            message: {
              from: { id: 60000 + i, username: `user${i}` },
              text: '/start',
              chat: { id: 60000 + i }
            }
          });
        requests.push(request_promise);
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all users were created
      const createdUsers = await User.find({ 
        telegram_id: { $gte: 60000, $lt: 60000 + concurrentRequests } 
      });
      expect(createdUsers).toHaveLength(concurrentRequests);
    });

    test('should handle database query performance', async () => {
      // Create test data for performance testing
      const testUsers = [];
      for (let i = 0; i < 1000; i++) {
        testUsers.push({
          telegram_id: 70000 + i,
          email: `perf${i}@example.com`,
          gdpr_consent: true,
          created_at: new Date()
        });
      }
      await User.insertMany(testUsers);

      // Test query performance
      const startTime = Date.now();
      const users = await User.find({ gdpr_consent: true }).limit(100);
      const queryTime = Date.now() - startTime;

      expect(users).toHaveLength(100);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('GDPR and Privacy Compliance', () => {
    test('should respect user privacy preferences in all communications', async () => {
      const userId = 80000;
      
      // Create user with specific privacy preferences
      const user = new User({
        telegram_id: userId,
        email: 'privacy@example.com',
        gdpr_consent: true,
        email_notifications: false, // User opted out of emails
        telegram_notifications: true,
        data_retention_days: 30
      });
      await user.save();

      // Attempt to send campaign - should respect email preferences
      const campaign = new Campaign({
        name: 'Privacy Test Campaign',
        subject: 'Test Subject',
        content: 'Test content',
        target_audience: 'all_subscribers',
        status: 'scheduled'
      });
      await campaign.save();

      const campaignResponse = await request(app)
        .post('/api/campaigns/execute')
        .send({ campaign_id: campaign._id });

      expect(campaignResponse.status).toBe(200);

      // Verify user was excluded from email campaign
      const updatedCampaign = await Campaign.findById(campaign._id);
      expect(updatedCampaign.excluded_users).toContain(userId.toString());
    });

    test('should handle data deletion requests', async () => {
      const userId = 90000;
      
      // Create user with associated data
      const user = new User({
        telegram_id: userId,
        email: 'delete@example.com',
        gdpr_consent: true
      });
      await user.save();

      // Create associated analytics data
      const analytics = new Analytics({
        user_id: userId,
        event_type: 'test_event',
        event_data: { test: 'data' }
      });
      await analytics.save();

      // Request data deletion
      const deleteResponse = await request(app)
        .post('/api/gdpr/delete-user-data')
        .send({ user_id: userId });

      expect(deleteResponse.status).toBe(200);

      // Verify all user data was deleted
      const deletedUser = await User.findOne({ telegram_id: userId });
      const deletedAnalytics = await Analytics.findOne({ user_id: userId });
      
      expect(deletedUser).toBeNull();
      expect(deletedAnalytics).toBeNull();
    });
  });
});

