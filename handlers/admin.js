const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Analytics = require('../models/Analytics');
const discountGenerator = require('../utils/discountGenerator');
const auth = require('../middleware/auth');

class AdminHandler {
  /**
   * Handle /admin command - show admin panel
   * @param {object} ctx - Telegraf context
   */
  async adminPanel(ctx) {
    try {
      const stats = await this.getQuickStats();
      
      const adminText = (
        '🔧 <b>Digi-King Bot Admin Panel</b>\n\n' +
        `📊 <b>Quick Stats:</b>\n` +
        `• Total Users: ${stats.totalUsers}\n` +
        `• Subscribers: ${stats.subscribers}\n` +
        `• Active Campaigns: ${stats.activeCampaigns}\n` +
        `• This Month: +${stats.newThisMonth} users\n\n` +
        '👉 Choose an action below:'
      );
      
      const keyboard = [
        [
          { text: '📊 Analytics', callback_data: 'admin_analytics' },
          { text: '🎁 Campaigns', callback_data: 'admin_campaigns' }
        ],
        [
          { text: '📫 Broadcast', callback_data: 'admin_broadcast' },
          { text: '💳 Discounts', callback_data: 'admin_discounts' }
        ],
        [
          { text: '👥 Users', callback_data: 'admin_users' },
          { text: '⚙️ Settings', callback_data: 'admin_settings' }
        ],
        [
          { text: '🔄 Refresh Stats', callback_data: 'admin_refresh' }
        ]
      ];
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(adminText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(adminText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    } catch (error) {
      console.error('Error in adminPanel:', error);
      await ctx.reply('❌ Error loading admin panel.');
    }
  }

  /**
   * Show analytics dashboard
   * @param {object} ctx - Telegraf context
   */
  async showAnalytics(ctx) {
    try {
      const analytics = await this.getDetailedAnalytics();
      
      const analyticsText = (
        '📊 <b>Analytics Dashboard</b>\n\n' +
        `👥 <b>Users:</b>\n` +
        `• Total: ${analytics.users.total}\n` +
        `• Subscribed: ${analytics.users.subscribed}\n` +
        `• Active (30d): ${analytics.users.active}\n` +
        `• New (7d): ${analytics.users.newWeek}\n\n` +
        `🎁 <b>Campaigns:</b>\n` +
        `• Total Sent: ${analytics.campaigns.totalSent}\n` +
        `• Avg Open Rate: ${analytics.campaigns.avgOpenRate}%\n` +
        `• Avg Click Rate: ${analytics.campaigns.avgClickRate}%\n\n` +
        `💰 <b>Revenue:</b>\n` +
        `• This Month: $${analytics.revenue.thisMonth}\n` +
        `• Last Month: $${analytics.revenue.lastMonth}\n` +
        `• Total: $${analytics.revenue.total}`
      );
      
      const keyboard = [
        [
          { text: '📈 Detailed Report', callback_data: 'admin_detailed_analytics' },
          { text: '📥 Export Data', callback_data: 'admin_export_analytics' }
        ],
        [
          { text: '⬅️ Back to Admin', callback_data: 'admin_panel' }
        ]
      ];
      
      await ctx.editMessageText(analyticsText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error in showAnalytics:', error);
      await ctx.reply('❌ Error loading analytics.');
    }
  }

  /**
   * Show campaign management
   * @param {object} ctx - Telegraf context
   */
  async manageCampaigns(ctx) {
    try {
      const campaigns = await Campaign.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name status type analytics.sent analytics.clicks createdAt');
      
      let campaignText = '🎁 <b>Campaign Management</b>\n\n';
      
      if (campaigns.length === 0) {
        campaignText += 'No campaigns found. Create your first campaign!';
      } else {
        campaignText += '<b>Recent Campaigns:</b>\n';
        campaigns.forEach((campaign, index) => {
          const statusIcon = {
            'draft': '📝',
            'active': '✅',
            'scheduled': '🕰',
            'completed': '✅',
            'paused': '⏸',
            'cancelled': '❌'
          }[campaign.status] || '❓';
          
          campaignText += `${index + 1}. ${statusIcon} ${campaign.name}\n`;
          campaignText += `   • Type: ${campaign.type}\n`;
          campaignText += `   • Sent: ${campaign.analytics.sent} | Clicks: ${campaign.analytics.clicks}\n\n`;
        });
      }
      
      const keyboard = [
        [
          { text: '➕ Create Campaign', callback_data: 'admin_create_campaign' },
          { text: '📋 List All', callback_data: 'admin_list_campaigns' }
        ],
        [
          { text: '📅 Scheduled', callback_data: 'admin_scheduled_campaigns' },
          { text: '📊 Performance', callback_data: 'admin_campaign_performance' }
        ],
        [
          { text: '⬅️ Back to Admin', callback_data: 'admin_panel' }
        ]
      ];
      
      await ctx.editMessageText(campaignText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error in manageCampaigns:', error);
      await ctx.reply('❌ Error loading campaigns.');
    }
  }

  /**
   * Handle broadcast message setup
   * @param {object} ctx - Telegraf context
   */
  async setupBroadcast(ctx) {
    try {
      const broadcastText = (
        '📫 <b>Broadcast Message</b>\n\n' +
        'Send a message to all subscribers or specific segments.\n\n' +
        '🎯 <b>Target Options:</b>\n' +
        '• All subscribers\n' +
        '• New customers\n' +
        '• Returning customers\n' +
        '• VIP customers\n' +
        '• Inactive users\n\n' +
        'Choose your target audience:'
      );
      
      const keyboard = [
        [
          { text: '👥 All Subscribers', callback_data: 'broadcast_all' },
          { text: '🆕 New Customers', callback_data: 'broadcast_new' }
        ],
        [
          { text: '🔄 Returning', callback_data: 'broadcast_returning' },
          { text: '🎆 VIP', callback_data: 'broadcast_vip' }
        ],
        [
          { text: '💤 Inactive', callback_data: 'broadcast_inactive' },
          { text: '🎯 Custom', callback_data: 'broadcast_custom' }
        ],
        [
          { text: '⬅️ Back to Admin', callback_data: 'admin_panel' }
        ]
      ];
      
      await ctx.editMessageText(broadcastText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error in setupBroadcast:', error);
      await ctx.reply('❌ Error setting up broadcast.');
    }
  }

  /**
   * Handle discount code management
   * @param {object} ctx - Telegraf context
   */
  async manageDiscounts(ctx) {
    try {
      // Get recent campaigns with discount codes
      const discountCampaigns = await Campaign.find({
        'discountCode.code': { $exists: true }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name discountCode analytics.conversions');
      
      let discountText = '💳 <b>Discount Code Management</b>\n\n';
      
      if (discountCampaigns.length > 0) {
        discountText += '<b>Recent Discount Campaigns:</b>\n';
        discountCampaigns.forEach((campaign, index) => {
          const code = campaign.discountCode;
          const usagePercent = code.maxUses ? 
            Math.round((code.usedCount / code.maxUses) * 100) : 0;
          
          discountText += `${index + 1}. ${code.code}\n`;
          discountText += `   • ${code.percentage}% off, Used: ${code.usedCount}`;
          if (code.maxUses) discountText += `/${code.maxUses} (${usagePercent}%)`;
          discountText += '\n\n';
        });
      } else {
        discountText += 'No discount campaigns found.\n\n';
      }
      
      const keyboard = [
        [
          { text: '➕ Generate Codes', callback_data: 'admin_generate_discount' },
          { text: '📄 View All Codes', callback_data: 'admin_list_discounts' }
        ],
        [
          { text: '📊 Usage Stats', callback_data: 'admin_discount_stats' },
          { text: '⚙️ Bulk Actions', callback_data: 'admin_bulk_discounts' }
        ],
        [
          { text: '⬅️ Back to Admin', callback_data: 'admin_panel' }
        ]
      ];
      
      await ctx.editMessageText(discountText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error in manageDiscounts:', error);
      await ctx.reply('❌ Error loading discount management.');
    }
  }

  /**
   * Handle user management
   * @param {object} ctx - Telegraf context
   */
  async manageUsers(ctx) {
    try {
      const userStats = await this.getUserStats();
      
      const userText = (
        '👥 <b>User Management</b>\n\n' +
        `📊 <b>Statistics:</b>\n` +
        `• Total Users: ${userStats.total}\n` +
        `• Subscribed: ${userStats.subscribed}\n` +
        `• Unsubscribed: ${userStats.unsubscribed}\n` +
        `• Never Subscribed: ${userStats.neverSubscribed}\n` +
        `• Blocked Bot: ${userStats.blocked}\n\n` +
        `🎯 <b>Segments:</b>\n` +
        `• New Customers: ${userStats.segments.new_customer}\n` +
        `• Returning: ${userStats.segments.returning_customer}\n` +
        `• VIP: ${userStats.segments.vip}\n` +
        `• Inactive: ${userStats.segments.inactive}`
      );
      
      const keyboard = [
        [
          { text: '🔍 Search User', callback_data: 'admin_search_user' },
          { text: '📥 Export Users', callback_data: 'admin_export_users' }
        ],
        [
          { text: '📈 Segment Analysis', callback_data: 'admin_segment_analysis' },
          { text: '🚫 Blocked Users', callback_data: 'admin_blocked_users' }
        ],
        [
          { text: '⬅️ Back to Admin', callback_data: 'admin_panel' }
        ]
      ];
      
      await ctx.editMessageText(userText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error in manageUsers:', error);
      await ctx.reply('❌ Error loading user management.');
    }
  }

  /**
   * Create a new campaign
   * @param {object} campaignData - Campaign data
   * @param {string} createdBy - Admin user ID
   * @returns {object} Created campaign
   */
  async createCampaign(campaignData, createdBy) {
    try {
      const campaign = new Campaign({
        ...campaignData,
        createdBy,
        status: 'draft'
      });
      
      // Generate discount code if needed
      if (campaignData.type === 'discount') {
        const discountCode = discountGenerator.generateDiscountCode({
          percentage: campaignData.discountPercentage || 10,
          expiryDays: campaignData.expiryDays || 7,
          segments: campaignData.targetSegments || []
        });
        
        campaign.discountCode = discountCode;
      }
      
      await campaign.save();
      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Send broadcast message
   * @param {string} message - Message to broadcast
   * @param {string[]} targetSegments - Target user segments
   * @param {object} options - Additional options
   */
  async sendBroadcast(message, targetSegments, options = {}) {
    try {
      const query = { isSubscribed: true };
      
      if (targetSegments && targetSegments.length > 0 && !targetSegments.includes('all')) {
        query.segments = { $in: targetSegments };
      }
      
      const users = await User.find(query).select('telegramId');
      
      console.log(`Broadcasting to ${users.length} users...`);
      
      // Create campaign for tracking
      const campaign = await this.createCampaign({
        name: `Broadcast - ${new Date().toISOString()}`,
        description: 'Admin broadcast message',
        type: 'announcement',
        targetSegments,
        message: {
          text: message,
          parseMode: options.parseMode || 'HTML'
        }
      }, options.adminUserId);
      
      let sent = 0;
      let failed = 0;
      
      // Send messages (in production, you'd want to batch this)
      for (const user of users) {
        try {
          // Note: You'll need to pass the bot instance to actually send messages
          // This is a placeholder for the actual sending logic
          console.log(`Would send to user: ${user.telegramId}`);
          sent++;
          
          // Track message sent
          await Analytics.create({
            type: 'message_sent',
            userId: user.telegramId,
            campaignId: campaign.campaignId,
            data: { broadcast: true }
          });
        } catch (error) {
          console.error(`Failed to send to ${user.telegramId}:`, error);
          failed++;
        }
      }
      
      // Update campaign analytics
      campaign.analytics.sent = sent;
      campaign.analytics.failed = failed;
      campaign.status = 'completed';
      campaign.sentAt = new Date();
      campaign.completedAt = new Date();
      await campaign.save();
      
      return { sent, failed, campaignId: campaign.campaignId };
    } catch (error) {
      console.error('Error sending broadcast:', error);
      throw error;
    }
  }

  /**
   * Get quick statistics for admin panel
   * @returns {object} Quick stats
   */
  async getQuickStats() {
    const [totalUsers, subscribers, activeCampaigns, newThisMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSubscribed: true }),
      Campaign.countDocuments({ status: 'active' }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);
    
    return {
      totalUsers,
      subscribers,
      activeCampaigns,
      newThisMonth
    };
  }

  /**
   * Get detailed analytics
   * @returns {object} Detailed analytics
   */
  async getDetailedAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    const [userStats, campaignStats, revenueStats] = await Promise.all([
      this.getUserAnalytics(thirtyDaysAgo, sevenDaysAgo),
      this.getCampaignAnalytics(),
      this.getRevenueAnalytics()
    ]);
    
    return {
      users: userStats,
      campaigns: campaignStats,
      revenue: revenueStats
    };
  }

  /**
   * Get user analytics
   * @param {Date} thirtyDaysAgo - 30 days ago date
   * @param {Date} sevenDaysAgo - 7 days ago date
   * @returns {object} User analytics
   */
  async getUserAnalytics(thirtyDaysAgo, sevenDaysAgo) {
    const [total, subscribed, active, newWeek] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSubscribed: true }),
      User.countDocuments({ lastInteraction: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ]);
    
    return { total, subscribed, active, newWeek };
  }

  /**
   * Get campaign analytics
   * @returns {object} Campaign analytics
   */
  async getCampaignAnalytics() {
    const campaigns = await Campaign.find({
      status: 'completed',
      'analytics.sent': { $gt: 0 }
    }).select('analytics');
    
    const totalSent = campaigns.reduce((sum, c) => sum + c.analytics.sent, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.analytics.clicks, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.analytics.delivered, 0);
    
    const avgOpenRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const avgClickRate = totalDelivered > 0 ? Math.round((totalClicks / totalDelivered) * 100) : 0;
    
    return {
      totalSent,
      avgOpenRate,
      avgClickRate
    };
  }

  /**
   * Get revenue analytics
   * @returns {object} Revenue analytics
   */
  async getRevenueAnalytics() {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
    
    const [thisMonthRevenue, lastMonthRevenue, totalRevenue] = await Promise.all([
      Analytics.aggregate([
        {
          $match: {
            type: 'discount_used',
            createdAt: { $gte: thisMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$data.orderValue' }
          }
        }
      ]),
      Analytics.aggregate([
        {
          $match: {
            type: 'discount_used',
            createdAt: { $gte: lastMonth, $lte: lastMonthEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$data.orderValue' }
          }
        }
      ]),
      Analytics.aggregate([
        {
          $match: {
            type: 'discount_used'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$data.orderValue' }
          }
        }
      ])
    ]);
    
    return {
      thisMonth: thisMonthRevenue[0]?.total || 0,
      lastMonth: lastMonthRevenue[0]?.total || 0,
      total: totalRevenue[0]?.total || 0
    };
  }

  /**
   * Get user statistics by segments
   * @returns {object} User statistics
   */
  async getUserStats() {
    const [total, subscribed, unsubscribed, neverSubscribed, blocked] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSubscribed: true }),
      User.countDocuments({ isSubscribed: false, subscribedAt: { $exists: true } }),
      User.countDocuments({ subscribedAt: { $exists: false } }),
      User.countDocuments({ botBlocked: true })
    ]);
    
    const segmentCounts = await User.aggregate([
      { $unwind: '$segments' },
      {
        $group: {
          _id: '$segments',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const segments = {
      new_customer: 0,
      returning_customer: 0,
      vip: 0,
      inactive: 0
    };
    
    segmentCounts.forEach(segment => {
      if (segments.hasOwnProperty(segment._id)) {
        segments[segment._id] = segment.count;
      }
    });
    
    return {
      total,
      subscribed,
      unsubscribed,
      neverSubscribed,
      blocked,
      segments
    };
  }
}

module.exports = new AdminHandler();

