const cron = require('node-cron');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const discountGenerator = require('./discountGenerator');

class CampaignScheduler {
  constructor(bot) {
    this.bot = bot;
    this.scheduledJobs = new Map();
    this.init();
  }

  /**
   * Initialize the scheduler
   */
  init() {
    // Check for scheduled campaigns every minute
    cron.schedule('* * * * *', () => {
      this.checkScheduledCampaigns();
    });

    // Daily cleanup and maintenance
    cron.schedule('0 2 * * *', () => {
      this.dailyMaintenance();
    });

    // Weekly user segment update
    cron.schedule('0 3 * * 0', () => {
      this.updateUserSegments();
    });

    console.log('⏰ Campaign scheduler initialized');
  }

  /**
   * Check for campaigns that should be sent now
   */
  async checkScheduledCampaigns() {
    try {
      const now = new Date();
      const campaigns = await Campaign.find({
        status: 'scheduled',
        'scheduling.sendAt': { $lte: now }
      });

      for (const campaign of campaigns) {
        await this.executeCampaign(campaign);
      }
    } catch (error) {
      console.error('Error checking scheduled campaigns:', error);
    }
  }

  /**
   * Execute a scheduled campaign
   * @param {object} campaign - Campaign to execute
   */
  async executeCampaign(campaign) {
    try {
      console.log(`🚀 Executing campaign: ${campaign.name}`);
      
      // Update campaign status
      campaign.status = 'active';
      campaign.sentAt = new Date();
      await campaign.save();

      // Get target users
      const users = await this.getTargetUsers(campaign.targetSegments);
      console.log(`🎯 Targeting ${users.length} users`);

      let sent = 0;
      let failed = 0;

      // Send messages to users
      for (const user of users) {
        try {
          await this.sendCampaignMessage(user, campaign);
          sent++;
          
          // Add small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send campaign to ${user.telegramId}:`, error);
          failed++;
        }
      }

      // Update campaign analytics
      campaign.analytics.sent = sent;
      campaign.analytics.failed = failed;
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      await campaign.save();

      console.log(`✅ Campaign completed: ${sent} sent, ${failed} failed`);
    } catch (error) {
      console.error('Error executing campaign:', error);
      
      // Mark campaign as failed
      campaign.status = 'cancelled';
      await campaign.save();
    }
  }

  /**
   * Get target users for a campaign
   * @param {string[]} targetSegments - Target segments
   * @returns {Array} Target users
   */
  async getTargetUsers(targetSegments) {
    const query = { 
      isSubscribed: true,
      botBlocked: { $ne: true }
    };

    if (targetSegments && targetSegments.length > 0 && !targetSegments.includes('all')) {
      query.segments = { $in: targetSegments };
    }

    return await User.find(query).select('telegramId preferences');
  }

  /**
   * Send campaign message to a user
   * @param {object} user - Target user
   * @param {object} campaign - Campaign to send
   */
  async sendCampaignMessage(user, campaign) {
    try {
      // Check user preferences
      if (!this.checkUserPreferences(user, campaign)) {
        return;
      }

      const messageOptions = {
        parse_mode: campaign.message.parseMode || 'HTML',
        disable_web_page_preview: campaign.message.disableWebPagePreview
      };

      // Add inline keyboard if present
      if (campaign.inlineKeyboard && campaign.inlineKeyboard.length > 0) {
        messageOptions.reply_markup = {
          inline_keyboard: [campaign.inlineKeyboard.map(button => ({
            text: button.text,
            url: button.url || undefined,
            callback_data: button.callbackData || undefined
          }))]
        };
      }

      // Send media or text message
      if (campaign.media && campaign.media.fileId) {
        await this.sendMediaMessage(user.telegramId, campaign, messageOptions);
      } else {
        await this.bot.telegram.sendMessage(
          user.telegramId,
          campaign.message.text,
          messageOptions
        );
      }

      // Track message sent
      await Analytics.create({
        type: 'message_sent',
        userId: user.telegramId,
        campaignId: campaign.campaignId,
        data: {
          campaignType: campaign.type,
          segments: user.segments
        }
      });

    } catch (error) {
      if (error.code === 403) {
        // User blocked the bot
        await User.updateOne(
          { telegramId: user.telegramId },
          { botBlocked: true }
        );
      }
      throw error;
    }
  }

  /**
   * Send media message
   * @param {string} chatId - Chat ID
   * @param {object} campaign - Campaign object
   * @param {object} options - Message options
   */
  async sendMediaMessage(chatId, campaign, options) {
    const { media } = campaign;
    
    switch (media.type) {
      case 'photo':
        await this.bot.telegram.sendPhoto(chatId, media.fileId, {
          ...options,
          caption: media.caption || campaign.message.text
        });
        break;
      case 'video':
        await this.bot.telegram.sendVideo(chatId, media.fileId, {
          ...options,
          caption: media.caption || campaign.message.text
        });
        break;
      case 'document':
        await this.bot.telegram.sendDocument(chatId, media.fileId, {
          ...options,
          caption: media.caption || campaign.message.text
        });
        break;
      case 'animation':
        await this.bot.telegram.sendAnimation(chatId, media.fileId, {
          ...options,
          caption: media.caption || campaign.message.text
        });
        break;
      default:
        // Fallback to text message
        await this.bot.telegram.sendMessage(chatId, campaign.message.text, options);
    }
  }

  /**
   * Check if user preferences allow this campaign
   * @param {object} user - User object
   * @param {object} campaign - Campaign object
   * @returns {boolean} Whether to send campaign
   */
  checkUserPreferences(user, campaign) {
    const prefs = user.preferences;
    
    switch (campaign.type) {
      case 'discount':
      case 'personalized':
        return prefs.promotions;
      case 'new_product':
        return prefs.newProducts;
      case 'newsletter':
      case 'announcement':
        return prefs.notifications;
      default:
        return true;
    }
  }

  /**
   * Schedule a campaign
   * @param {object} campaign - Campaign to schedule
   */
  async scheduleCampaign(campaign) {
    try {
      if (campaign.scheduling.recurring.enabled) {
        await this.setupRecurringCampaign(campaign);
      } else {
        // One-time campaign
        campaign.status = 'scheduled';
        await campaign.save();
        console.log(`🗺 Campaign scheduled: ${campaign.name} for ${campaign.scheduling.sendAt}`);
      }
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      throw error;
    }
  }

  /**
   * Setup recurring campaign
   * @param {object} campaign - Campaign to setup
   */
  async setupRecurringCampaign(campaign) {
    const { recurring } = campaign.scheduling;
    let cronPattern;

    switch (recurring.frequency) {
      case 'daily':
        cronPattern = `0 ${recurring.time.split(':')[1]} ${recurring.time.split(':')[0]} * * *`;
        break;
      case 'weekly':
        cronPattern = `0 ${recurring.time.split(':')[1]} ${recurring.time.split(':')[0]} * * ${recurring.dayOfWeek}`;
        break;
      case 'monthly':
        cronPattern = `0 ${recurring.time.split(':')[1]} ${recurring.time.split(':')[0]} ${recurring.dayOfMonth} * *`;
        break;
      default:
        throw new Error('Invalid recurring frequency');
    }

    // Schedule the recurring job
    const job = cron.schedule(cronPattern, async () => {
      try {
        // Create a copy of the campaign for this execution
        const campaignCopy = await Campaign.findById(campaign._id);
        if (campaignCopy && campaignCopy.status === 'scheduled') {
          await this.executeCampaign(campaignCopy);
        }
      } catch (error) {
        console.error('Error in recurring campaign:', error);
      }
    }, {
      scheduled: false
    });

    this.scheduledJobs.set(campaign.campaignId, job);
    job.start();

    campaign.status = 'scheduled';
    await campaign.save();

    console.log(`🔄 Recurring campaign scheduled: ${campaign.name}`);
  }

  /**
   * Cancel a scheduled campaign
   * @param {string} campaignId - Campaign ID to cancel
   */
  async cancelScheduledCampaign(campaignId) {
    try {
      const campaign = await Campaign.findOne({ campaignId });
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Stop recurring job if exists
      if (this.scheduledJobs.has(campaignId)) {
        this.scheduledJobs.get(campaignId).stop();
        this.scheduledJobs.delete(campaignId);
      }

      campaign.status = 'cancelled';
      await campaign.save();

      console.log(`❌ Campaign cancelled: ${campaign.name}`);
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      throw error;
    }
  }

  /**
   * Daily maintenance tasks
   */
  async dailyMaintenance() {
    try {
      console.log('🧹 Running daily maintenance...');

      // Clean up old completed campaigns
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      await Campaign.deleteMany({
        status: 'completed',
        completedAt: { $lt: thirtyDaysAgo }
      });

      // Mark expired discount codes as inactive
      await Campaign.updateMany(
        {
          'discountCode.expiryDate': { $lt: new Date() },
          'discountCode.isActive': true
        },
        {
          $set: { 'discountCode.isActive': false }
        }
      );

      // Clean up old analytics data (older than 90 days)
      const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
      await Analytics.deleteMany({
        createdAt: { $lt: ninetyDaysAgo }
      });

      console.log('✅ Daily maintenance completed');
    } catch (error) {
      console.error('Error in daily maintenance:', error);
    }
  }

  /**
   * Update user segments weekly
   */
  async updateUserSegments() {
    try {
      console.log('📊 Updating user segments...');

      const users = await User.find({}).select('_id segments totalPurchases totalSpent lastInteraction');
      
      for (const user of users) {
        user.updateSegment();
        await user.save();
      }

      console.log(`✅ Updated segments for ${users.length} users`);
    } catch (error) {
      console.error('Error updating user segments:', error);
    }
  }

  /**
   * Create and schedule a welcome campaign for new subscribers
   * @param {string} userId - User ID
   */
  async scheduleWelcomeCampaign(userId) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user || !user.isSubscribed) return;

      // Generate welcome discount code
      const discountCode = discountGenerator.generatePersonalizedCode(user, {
        expiryDays: 7
      });

      // Create welcome campaign
      const welcomeCampaign = new Campaign({
        name: `Welcome - ${user.telegramId}`,
        description: 'Automated welcome message with discount',
        type: 'personalized',
        targetSegments: ['new_customer'],
        message: {
          text: `🎉 Welcome to Digi-King, ${user.firstName || 'friend'}!\n\n` +
                `Thank you for subscribing to our newsletter. ` +
                `Here's a special discount code just for you:\n\n` +
                `🎁 Use code <b>${discountCode}</b> for 15% off your first order!\n\n` +
                `This code expires in 7 days, so don't wait too long!`,
          parseMode: 'HTML'
        },
        discountCode: {
          code: discountCode,
          percentage: 15,
          expiryDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
          maxUses: 1,
          isActive: true
        },
        inlineKeyboard: [
          {
            text: '🛍️ Shop Now',
            url: 'https://digi-king.com/shop'
          }
        ],
        scheduling: {
          sendAt: new Date(Date.now() + (5 * 60 * 1000)) // Send in 5 minutes
        },
        createdBy: 'system'
      });

      await welcomeCampaign.save();
      console.log(`📧 Welcome campaign scheduled for user ${userId}`);
    } catch (error) {
      console.error('Error scheduling welcome campaign:', error);
    }
  }
}

module.exports = CampaignScheduler;

