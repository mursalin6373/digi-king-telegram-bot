require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Database connection
const dbConnection = require('../database/connection');

// Middleware
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// Handlers
const subscriptionHandler = require('../handlers/subscription');
const adminHandler = require('../handlers/admin');
const affiliateHandler = require('../handlers/affiliate');
const referralHandler = require('../handlers/referral');
const emailAutomationHandler = require('../handlers/emailAutomation');
const conversionFunnelHandler = require('../handlers/conversionFunnel');

// Utils
const discountGenerator = require('../utils/discountGenerator');
const CampaignScheduler = require('../utils/scheduler');

// Models
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Analytics = require('../models/Analytics');

class DigiKingBot {
  constructor() {
    this.bot = null;
    this.app = null;
    this.scheduler = null;
    this.init();
  }

  async init() {
    try {
      // Connect to database
      await dbConnection.connect();
      
      // Initialize bot
      this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      
      // Initialize scheduler
      this.scheduler = new CampaignScheduler(this.bot);
      
      // Setup Express app for webhooks
      this.setupExpressApp();
      
      // Setup bot middleware and handlers
      this.setupBot();
      
      // Start the bot
      await this.start();
      
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      process.exit(1);
    }
  }

  setupExpressApp() {
    this.app = express();
    
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    
    // Serve static dashboard files
    this.app.use('/dashboard', express.static('dashboard'));
    
    // Analytics API routes
    const analyticsRouter = require('./api/analytics');
    this.app.use('/api/analytics', analyticsRouter);
    
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const dbHealth = await dbConnection.healthCheck();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbHealth
      });
    });
    
    // Webhook endpoints for commerce platform
    this.app.post('/webhook/commerce', async (req, res) => {
      try {
        await this.handleCommerceWebhook(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling commerce webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Order completion webhook
    this.app.post('/webhook/order-complete', async (req, res) => {
      try {
        await this.handleOrderComplete(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling order completion:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Affiliate sale webhook
    this.app.post('/webhook/affiliate-sale', async (req, res) => {
      try {
        await this.handleAffiliateSale(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling affiliate sale:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Discount usage webhook
    this.app.post('/webhook/discount-used', async (req, res) => {
      try {
        await this.handleDiscountUsage(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling discount usage:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // GDPR data deletion endpoint
    this.app.post('/api/gdpr/delete-user-data', async (req, res) => {
      try {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_API_KEY) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        await this.deleteUserData(req.body.user_id);
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting user data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Campaign execution endpoint
    this.app.post('/api/campaigns/execute', async (req, res) => {
      try {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_API_KEY) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        await this.executeCampaign(req.body.campaign_id);
        res.json({ success: true });
      } catch (error) {
        console.error('Error executing campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Bot webhook endpoint
    this.app.use(this.bot.webhookCallback('/bot-webhook'));
  }

  setupBot() {
    // Global middleware
    this.bot.use(auth.ensureUser);
    this.bot.use(rateLimit.general);
    
    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      if (ctx && ctx.reply) {
        ctx.reply('❌ An unexpected error occurred. Please try again later.');
      }
    });
    
    // Start command
    this.bot.start(async (ctx) => {
      const startPayload = ctx.startPayload;
      
      // Check for referral code in start payload
      if (startPayload && startPayload.startsWith('ref_')) {
        const referralCode = startPayload.substring(4);
        await this.processReferralSignup(ctx, referralCode);
      }
      
      const welcomeMessage = (
        '👋 Welcome to <b>Digi-King</b>!\n\n' +
        '🎯 Your one-stop destination for exclusive deals, new product updates, and personalized offers.\n\n' +
        '📧 Subscribe to our newsletter to receive:\n' +
        '• 🎁 Exclusive discount codes\n' +
        '• 🚀 Early access to new products\n' +
        '• 💝 Personalized offers\n' +
        '• 📰 Industry news and tips\n\n' +
        'Use the menu below to get started!'
      );
      
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📧 Subscribe to Newsletter', callback_data: 'subscribe_start' },
            ],
            [
              { text: '📊 My Profile', callback_data: 'view_profile' },
              { text: '🎁 Get Discount', callback_data: 'get_discount' }
            ],
            [
              { text: '❓ Help', callback_data: 'help' },
              { text: '⚙️ Settings', callback_data: 'settings' }
            ]
          ]
        }
      });
    });
    
    // Help command
    this.bot.help(async (ctx) => {
      const helpMessage = (
        '❓ <b>Digi-King Bot Help</b>\n\n' +
        '<b>Available Commands:</b>\n' +
        '/start - Welcome message and main menu\n' +
        '/subscribe - Subscribe to newsletter\n' +
        '/unsubscribe - Unsubscribe from newsletter\n' +
        '/profile - View your profile\n' +
        '/discount - Get personalized discount\n' +
        '/preferences - Manage notification preferences\n' +
        '/help - Show this help message\n\n' +
        '<b>Admin Commands:</b>\n' +
        '/admin - Admin panel (admin only)\n\n' +
        '💡 <b>Tips:</b>\n' +
        '• Use inline buttons for easier navigation\n' +
        '• Subscribe to get exclusive offers\n' +
        '• Update your preferences to control notifications\n\n' +
        '📞 Need support? Contact us at support@digi-king.com'
      );
      
      await ctx.reply(helpMessage, { parse_mode: 'HTML' });
    });
    
    // Subscription commands
    this.bot.command('subscribe', rateLimit.subscription, subscriptionHandler.subscribe.bind(subscriptionHandler));
    this.bot.command('unsubscribe', rateLimit.subscription, subscriptionHandler.unsubscribe.bind(subscriptionHandler));
    this.bot.command('preferences', subscriptionHandler.managePreferences.bind(subscriptionHandler));
    
    // Profile command
    this.bot.command('profile', async (ctx) => {
      await this.showUserProfile(ctx);
    });
    
    // Discount command
    this.bot.command('discount', auth.requireSubscribed, async (ctx) => {
      await this.generatePersonalizedDiscount(ctx);
    });
    
    // Affiliate commands
    this.bot.command('affiliate', affiliateHandler.showDashboard.bind(affiliateHandler));
    this.bot.command('join_affiliate', affiliateHandler.registerAffiliate.bind(affiliateHandler));
    
    // Referral commands
    this.bot.command('referral', referralHandler.showReferralProgram.bind(referralHandler));
    
    // Admin commands
    this.bot.command('admin', auth.requireAdmin, rateLimit.admin, adminHandler.adminPanel.bind(adminHandler));
    
    // Handle email submission when user is waiting for email
    this.bot.on('text', async (ctx) => {
      if (ctx.user && ctx.user.waitingForEmail) {
        await rateLimit.email(ctx, async () => {
          await subscriptionHandler.handleEmailSubmission(ctx);
        });
      }
    });
    
    // Callback query handlers
    this.setupCallbackHandlers();
  }

  setupCallbackHandlers() {
    // Subscription callbacks
    this.bot.action('subscribe_start', rateLimit.subscription, subscriptionHandler.subscribe.bind(subscriptionHandler));
    this.bot.action('consent_and_subscribe', rateLimit.subscription, subscriptionHandler.consentAndSubscribe.bind(subscriptionHandler));
    this.bot.action('confirm_unsubscribe', rateLimit.subscription, subscriptionHandler.confirmUnsubscribe.bind(subscriptionHandler));
    this.bot.action('manage_preferences', subscriptionHandler.managePreferences.bind(subscriptionHandler));
    
    // Email handling callbacks
    this.bot.action(/^use_email:(.+)$/, rateLimit.email, subscriptionHandler.useEmail.bind(subscriptionHandler));
    
    // Profile and discount callbacks
    this.bot.action('view_profile', async (ctx) => {
      await this.showUserProfile(ctx);
    });
    
    this.bot.action('get_discount', auth.requireSubscribed, async (ctx) => {
      await this.generatePersonalizedDiscount(ctx);
    });
    
    this.bot.action('get_welcome_discount', auth.requireSubscribed, async (ctx) => {
      await this.generateWelcomeDiscount(ctx);
    });
    
    // Preference toggles
    this.bot.action('toggle_notifications', async (ctx) => {
      await this.togglePreference(ctx, 'notifications');
    });
    
    this.bot.action('toggle_promotions', async (ctx) => {
      await this.togglePreference(ctx, 'promotions');
    });
    
    this.bot.action('toggle_new_products', async (ctx) => {
      await this.togglePreference(ctx, 'newProducts');
    });
    
    // Admin callbacks
    this.bot.action('admin_panel', auth.requireAdmin, adminHandler.adminPanel.bind(adminHandler));
    this.bot.action('admin_analytics', auth.requireAdmin, adminHandler.showAnalytics.bind(adminHandler));
    this.bot.action('admin_campaigns', auth.requireAdmin, adminHandler.manageCampaigns.bind(adminHandler));
    this.bot.action('admin_broadcast', auth.requireAdmin, adminHandler.setupBroadcast.bind(adminHandler));
    this.bot.action('admin_discounts', auth.requireAdmin, adminHandler.manageDiscounts.bind(adminHandler));
    this.bot.action('admin_users', auth.requireAdmin, adminHandler.manageUsers.bind(adminHandler));
    this.bot.action('admin_refresh', auth.requireAdmin, adminHandler.adminPanel.bind(adminHandler));
    
    // Affiliate callbacks
    this.bot.action('affiliate_register', affiliateHandler.registerAffiliate.bind(affiliateHandler));
    this.bot.action('affiliate_confirm_register', affiliateHandler.confirmRegistration.bind(affiliateHandler));
    this.bot.action('affiliate_dashboard', affiliateHandler.showDashboard.bind(affiliateHandler));
    this.bot.action('affiliate_get_link', affiliateHandler.getReferralLinks.bind(affiliateHandler));
    this.bot.action('affiliate_request_payout', affiliateHandler.requestPayout.bind(affiliateHandler));
    this.bot.action('affiliate_marketing_kit', affiliateHandler.showMarketingKit.bind(affiliateHandler));
    
    // Referral callbacks
    this.bot.action('referral_program', referralHandler.showReferralProgram.bind(referralHandler));
    this.bot.action('referral_get_link', referralHandler.getReferralLink.bind(referralHandler));
    this.bot.action('referral_details', referralHandler.showReferralDetails.bind(referralHandler));
    this.bot.action('referral_help', referralHandler.showHowItWorks.bind(referralHandler));
    
    // Broadcast callbacks
    this.bot.action(/^broadcast_(.+)$/, auth.requireAdmin, async (ctx) => {
      const segment = ctx.match[1];
      await this.handleBroadcastSegment(ctx, segment);
    });
    
    // Analytics tracking for button clicks
    this.bot.on('callback_query', async (ctx, next) => {
      if (ctx.user) {
        await Analytics.create({
          type: 'button_click',
          userId: ctx.user.telegramId,
          data: {
            callbackData: ctx.callbackQuery.data,
            messageId: ctx.callbackQuery.message.message_id
          }
        });
      }
      
      await ctx.answerCbQuery();
      return next();
    });
  }

  async showUserProfile(ctx) {
    try {
      const user = ctx.user;
      
      const profileText = (
        '👤 <b>Your Profile</b>\n\n' +
        `📧 Email: ${user.email || 'Not provided'}\n` +
        `📬 Subscribed: ${user.isSubscribed ? '✅ Yes' : '❌ No'}\n` +
        `📅 Member since: ${user.createdAt.toLocaleDateString()}\n` +
        `🛍 Total purchases: ${user.totalPurchases}\n` +
        `💰 Total spent: $${user.totalSpent}\n` +
        `🏷 Segments: ${user.segments.join(', ') || 'None'}\n\n` +
        `🔔 <b>Preferences:</b>\n` +
        `• Notifications: ${user.preferences.notifications ? '✅' : '❌'}\n` +
        `• Promotions: ${user.preferences.promotions ? '✅' : '❌'}\n` +
        `• New Products: ${user.preferences.newProducts ? '✅' : '❌'}`
      );
      
      const keyboard = [
        [{ text: '⚙️ Edit Preferences', callback_data: 'manage_preferences' }]
      ];
      
      if (!user.isSubscribed) {
        keyboard.unshift([{ text: '📧 Subscribe Now', callback_data: 'subscribe_start' }]);
      } else {
        keyboard.unshift([{ text: '🎁 Get Discount', callback_data: 'get_discount' }]);
      }
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(profileText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(profileText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    } catch (error) {
      console.error('Error showing user profile:', error);
      await ctx.reply('❌ Error loading your profile.');
    }
  }

  async generatePersonalizedDiscount(ctx) {
    try {
      const user = ctx.user;
      
      // Generate personalized discount code
      const discountData = discountGenerator.generateDiscountCode({
        percentage: user.segments.includes('vip') ? 20 : 15,
        expiryDays: 7,
        segments: user.segments
      });
      
      const discountText = (
        '🎉 <b>Your Personalized Discount!</b>\n\n' +
        `🎁 Discount Code: <code>${discountData.code}</code>\n` +
        `💰 Discount: ${discountData.percentage}% off\n` +
        `⏰ Expires: ${discountData.expiryDate.toLocaleDateString()}\n\n` +
        '🛍 Use this code at checkout to save on your next purchase!\n\n' +
        '💡 <i>Tip: Screenshot this message to save your code</i>'
      );
      
      await ctx.reply(discountText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍️ Shop Now', url: 'https://digi-king.com/shop' }],
            [{ text: '📊 View Profile', callback_data: 'view_profile' }]
          ]
        }
      });
      
      // Track discount generation
      await Analytics.create({
        type: 'discount_used',
        userId: user.telegramId,
        data: {
          code: discountData.code,
          percentage: discountData.percentage,
          source: 'personalized'
        }
      });
      
    } catch (error) {
      console.error('Error generating discount:', error);
      await ctx.reply('❌ Error generating your discount code.');
    }
  }

  async generateWelcomeDiscount(ctx) {
    try {
      const user = ctx.user;
      
      // Generate welcome discount code
      const discountData = discountGenerator.generatePersonalizedCode(user, {
        percentage: 15,
        expiryDays: 14
      });
      
      const welcomeText = (
        '🎊 <b>Welcome Discount Code!</b>\n\n' +
        `🎁 Your Code: <code>${discountData}</code>\n` +
        `💰 15% off your first order\n` +
        `⏰ Valid for 14 days\n\n` +
        '🛍 Start shopping and save on your first purchase!\n\n' +
        '🙏 Thank you for joining the Digi-King community!'
      );
      
      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍️ Start Shopping', url: 'https://digi-king.com/shop' }],
            [{ text: '📋 View All Products', url: 'https://digi-king.com/products' }]
          ]
        }
      });
      
      // Schedule welcome campaign
      await this.scheduler.scheduleWelcomeCampaign(user.telegramId);
      
    } catch (error) {
      console.error('Error generating welcome discount:', error);
      await ctx.reply('❌ Error generating your welcome discount.');
    }
  }

  async togglePreference(ctx, preference) {
    try {
      const user = ctx.user;
      user.preferences[preference] = !user.preferences[preference];
      await user.save();
      
      await subscriptionHandler.managePreferences(ctx);
    } catch (error) {
      console.error('Error toggling preference:', error);
      await ctx.reply('❌ Error updating preferences.');
    }
  }

  async handleBroadcastSegment(ctx, segment) {
    // This would implement the broadcast functionality
    // For now, we'll show a placeholder
    await ctx.reply(`📋 Broadcast setup for segment: ${segment}\nThis feature is under development.`);
  }

  async handleCommerceWebhook(data) {
    try {
      console.log('📦 Commerce webhook received:', data);
      
      // Handle different webhook events
      switch (data.event) {
        case 'order.completed':
          await this.handleOrderCompleted(data.order);
          break;
        case 'discount.used':
          await this.handleDiscountUsed(data.discount, data.order);
          break;
        case 'product.created':
          await this.handleNewProduct(data.product);
          break;
        default:
          console.log('Unhandled webhook event:', data.event);
      }
    } catch (error) {
      console.error('Error handling commerce webhook:', error);
    }
  }

  async handleOrderCompleted(order) {
    try {
      // Find user by email
      const user = await User.findOne({ email: order.customer.email });
      if (!user) return;
      
      // Update user purchase data
      user.totalPurchases += 1;
      user.totalSpent += order.total;
      user.lastPurchaseDate = new Date();
      user.updateSegment();
      await user.save();
      
      // Track analytics
      await Analytics.create({
        type: 'discount_used',
        userId: user.telegramId,
        data: {
          orderId: order.id,
          orderValue: order.total,
          source: 'commerce_webhook'
        }
      });
      
      // Process referral completion if applicable
      await referralHandler.completeReferral(user.telegramId, order.total, order.id);
      
      // Process affiliate commission if applicable
      await affiliateHandler.confirmReferralPurchase(user.telegramId, order.total);
      
      // Trigger email automation sequence
      await emailAutomationHandler.sendPostPurchaseSequence(user.telegramId, {
        id: order.id,
        total: order.total,
        items: order.items || []
      });
      
      // Track conversion funnel stage
      await conversionFunnelHandler.trackFunnelStage(user.telegramId, 'purchase', {
        orderValue: order.total,
        orderId: order.id,
        source: 'commerce'
      });
      
      console.log(`💰 Order completed for user ${user.telegramId}: $${order.total}`);
    } catch (error) {
      console.error('Error handling order completed:', error);
    }
  }

  async handleDiscountUsed(discount, order) {
    try {
      // Find user by email
      const user = await User.findOne({ email: order.customer.email });
      if (!user) return;
      
      // Find campaign by discount code
      const campaign = await Campaign.findOne({ 'discountCode.code': discount.code });
      if (campaign) {
        // Update campaign analytics
        campaign.analytics.conversions += 1;
        campaign.analytics.revenue += order.total;
        campaign.discountCode.usedCount += 1;
        await campaign.save();
      }
      
      // Add to user's discount history
      user.addDiscountCode(discount.code, campaign?.campaignId, order.total);
      await user.save();
      
      console.log(`🎫 Discount used: ${discount.code} by user ${user.telegramId}`);
    } catch (error) {
      console.error('Error handling discount used:', error);
    }
  }

  async handleNewProduct(product) {
    try {
      // Create a new product announcement campaign
      const campaign = await adminHandler.createCampaign({
        name: `New Product: ${product.name}`,
        description: `Announcement for new product: ${product.name}`,
        type: 'new_product',
        targetSegments: ['all'],
        message: {
          text: (
            `🚀 <b>New Product Alert!</b>\n\n` +
            `📦 <b>${product.name}</b>\n` +
            `💰 Starting at $${product.price}\n\n` +
            `${product.description}\n\n` +
            `🛍 Shop now and be among the first to get it!`
          ),
          parseMode: 'HTML'
        },
        inlineKeyboard: [
          {
            text: '🛍️ View Product',
            url: product.url
          }
        ],
        scheduling: {
          sendAt: new Date(Date.now() + (60 * 1000)) // Send in 1 minute
        }
      }, 'system');
      
      await this.scheduler.scheduleCampaign(campaign);
      
      console.log(`📢 New product campaign scheduled: ${product.name}`);
    } catch (error) {
      console.error('Error handling new product:', error);
    }
  }
  
  /**
   * Process referral signup when user starts bot with referral code
   * @param {object} ctx - Telegraf context
   * @param {string} referralCode - Referral code
   */
  async processReferralSignup(ctx, referralCode) {
    try {
      const userId = ctx.from.id.toString();
      
      // Process referral signup
      const referral = await referralHandler.processReferralSignup(referralCode, userId);
      
      if (referral) {
        // Show welcome message with referral bonus
        await ctx.reply(
          '🎉 <b>Welcome via Referral!</b>\n\n' +
          'You\'ve been referred by a friend! Once you subscribe and make your first purchase, ' +
          'you\'ll both receive exclusive rewards.\n\n' +
          '📧 Subscribe now to get started and claim your referral bonus!',
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📧 Subscribe & Get Bonus', callback_data: 'subscribe_start' }],
                [{ text: '❓ How It Works', callback_data: 'referral_help' }]
              ]
            }
          }
        );
        
        // Track referral funnel stage
        await conversionFunnelHandler.trackFunnelStage(userId, 'awareness', {
          source: 'referral',
          referralCode
        });
        
        console.log(`🎯 Referral signup processed: ${referralCode} -> ${userId}`);
      }
    } catch (error) {
      console.error('Error processing referral signup:', error);
    }
  }
  
  async handleOrderComplete(orderData) {
    try {
      const { user_id, order_id, order_amount, products = [], payment_status } = orderData;
      
      if (payment_status !== 'completed') {
        return;
      }
      
      // Find user
      const user = await User.findOne({ telegram_id: user_id });
      if (!user) {
        console.log(`User not found for order completion: ${user_id}`);
        return;
      }
      
      // Update user purchase data
      user.totalPurchases += 1;
      user.totalSpent += order_amount;
      user.lastPurchaseDate = new Date();
      await user.save();
      
      // Track analytics
      await Analytics.create({
        user_id: user_id,
        event_type: 'purchase',
        event_data: {
          order_id,
          order_amount,
          products
        },
        timestamp: new Date()
      });
      
      // Process referral completion
      await referralHandler.completeReferral(user_id, order_amount, order_id);
      
      // Process affiliate commission
      await affiliateHandler.confirmReferralPurchase(user_id, order_amount);
      
      console.log(`💰 Order completed for user ${user_id}: $${order_amount}`);
    } catch (error) {
      console.error('Error handling order completion:', error);
    }
  }
  
  async handleAffiliateSale(saleData) {
    try {
      const { affiliate_code, sale_amount, customer_email, product_id } = saleData;
      
      // Find affiliate by code
      const Affiliate = require('./models/Affiliate');
      const affiliate = await Affiliate.findOne({ affiliate_code });
      
      if (!affiliate) {
        console.log(`Affiliate not found for code: ${affiliate_code}`);
        return;
      }
      
      // Calculate commission
      const commission = sale_amount * (affiliate.commission_rate / 100);
      
      // Update affiliate totals
      affiliate.total_sales += sale_amount;
      affiliate.total_commission += commission;
      affiliate.sales_count += 1;
      await affiliate.save();
      
      // Track analytics
      await Analytics.create({
        user_id: affiliate.user_id,
        event_type: 'affiliate_sale',
        event_data: {
          affiliate_code,
          sale_amount,
          commission,
          customer_email,
          product_id
        },
        timestamp: new Date()
      });
      
      console.log(`🤝 Affiliate sale processed: ${affiliate_code} - $${sale_amount} (Commission: $${commission})`);
    } catch (error) {
      console.error('Error handling affiliate sale:', error);
    }
  }
  
  async handleDiscountUsage(discountData) {
    try {
      const { code, user_id, order_amount, discount_amount } = discountData;
      
      // Find and update discount code
      const DiscountCode = require('./models/DiscountCode');
      const discountCode = await DiscountCode.findOne({ code });
      
      if (discountCode) {
        discountCode.current_uses += 1;
        await discountCode.save();
      }
      
      // Track analytics
      await Analytics.create({
        user_id,
        event_type: 'discount_used',
        event_data: {
          code,
          order_amount,
          discount_amount,
          savings_percentage: ((discount_amount / order_amount) * 100).toFixed(2)
        },
        timestamp: new Date()
      });
      
      console.log(`🎫 Discount used: ${code} by user ${user_id} - Saved $${discount_amount}`);
    } catch (error) {
      console.error('Error handling discount usage:', error);
    }
  }
  
  async deleteUserData(userId) {
    try {
      const User = require('./models/User');
      const Affiliate = require('./models/Affiliate');
      const Referral = require('./models/Referral');
      
      // Delete user and all associated data
      await User.deleteOne({ telegram_id: userId });
      await Affiliate.deleteOne({ user_id: userId });
      await Referral.deleteMany({ $or: [{ referrer_id: userId }, { referred_id: userId }] });
      await Analytics.deleteMany({ user_id: userId });
      
      console.log(`🗑️ User data deleted for user: ${userId}`);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }
  
  async executeCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Get target users based on campaign criteria
      let targetUsers = [];
      
      if (campaign.target_audience === 'all_subscribers') {
        targetUsers = await User.find({ 
          subscription_status: 'active',
          gdpr_consent: true,
          email_notifications: true
        });
      } else if (campaign.target_audience === 'vip') {
        targetUsers = await User.find({ 
          subscription_status: 'active',
          segments: 'vip',
          gdpr_consent: true,
          email_notifications: true
        });
      }
      
      // Execute campaign (this would integrate with email service)
      let sentCount = 0;
      let excludedUsers = [];
      
      for (const user of targetUsers) {
        // Respect user preferences
        if (!user.email_notifications || !user.gdpr_consent) {
          excludedUsers.push(user.telegram_id.toString());
          continue;
        }
        
        // Simulate sending email (integrate with actual email service)
        console.log(`📧 Sending campaign ${campaign.name} to ${user.email}`);
        sentCount++;
      }
      
      // Update campaign status
      campaign.status = 'sent';
      campaign.sent_count = sentCount;
      campaign.excluded_users = excludedUsers;
      campaign.executed_at = new Date();
      await campaign.save();
      
      console.log(`📢 Campaign executed: ${campaign.name} - Sent to ${sentCount} users`);
    } catch (error) {
      console.error('Error executing campaign:', error);
      throw error;
    }
  }

  async start() {
    try {
      const port = process.env.PORT || 3000;
      
      if (process.env.NODE_ENV === 'production') {
        // Set webhook for production
        const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
        if (webhookUrl) {
          await this.bot.telegram.setWebhook(webhookUrl);
          console.log(`📡 Webhook set: ${webhookUrl}`);
        }
        
        this.app.listen(port, () => {
          console.log(`🚀 Server running on port ${port}`);
        });
      } else {
        // Long polling for development
        await this.bot.launch();
        console.log('🤖 Bot started in polling mode');
      }
      
      console.log('✅ Digi-King bot is running!');
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      throw error;
    }
  }
}

// Start the bot
new DigiKingBot();

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

