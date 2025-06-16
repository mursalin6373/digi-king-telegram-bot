const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Analytics = require('../models/Analytics');
const emailAutomationHandler = require('../handlers/emailAutomation');
const affiliateHandler = require('../handlers/affiliate');
const referralHandler = require('../handlers/referral');
const conversionFunnelHandler = require('../handlers/conversionFunnel');

class LaunchManager {
  constructor(bot) {
    this.bot = bot;
    this.launchMetrics = {
      campaignsLaunched: 0,
      subscribersReached: 0,
      conversions: 0,
      revenue: 0,
      affiliateSignups: 0,
      referrals: 0
    };
  }

  /**
   * Execute multi-channel launch campaign
   */
  async executeLaunchCampaign() {
    try {
      console.log('🚀 Starting multi-channel launch campaign...');
      
      // Phase 1: Existing subscriber announcement
      await this.launchExistingSubscriberCampaign();
      
      // Phase 2: Affiliate program activation
      await this.activateAffiliateProgram();
      
      // Phase 3: Referral program promotion
      await this.promoteReferralProgram();
      
      // Phase 4: Social media campaign (automated messages)
      await this.launchSocialMediaCampaign();
      
      // Phase 5: Email automation sequences
      await this.activateEmailSequences();
      
      console.log('🎉 Launch campaign executed successfully!');
      return this.launchMetrics;
      
    } catch (error) {
      console.error('❌ Error executing launch campaign:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Launch campaign for existing subscribers
   */
  async launchExistingSubscriberCampaign() {
    try {
      console.log('📢 Phase 1: Launching existing subscriber campaign...');
      
      const subscribedUsers = await User.find({
        isSubscribed: true,
        preferences: { notifications: true }
      });

      const launchMessage = {
        text: (
          '🎉 <b>Big News from Digi-King!</b>\n\n' +
          '🚀 We\'ve just launched our enhanced marketing platform with incredible new features:\n\n' +
          '✨ <b>What\'s New:</b>\n' +
          '• 💰 Enhanced affiliate program (up to 20% commission)\n' +
          '• 🤝 Referral rewards (both you and friends get bonuses)\n' +
          '• 🎁 Personalized discount codes\n' +
          '• 📧 Smart email automation\n' +
          '• 🎯 Advanced conversion funnels\n\n' +
          '🎁 <b>Launch Special:</b> Get 25% off your next purchase!\n' +
          'Use code: <code>LAUNCH25</code>\n' +
          '⏰ Valid for 48 hours only!\n\n' +
          '👆 Click below to explore our new features!'
        ),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🛍️ Shop with Launch Discount', url: 'https://digi-king.com/shop?code=LAUNCH25' }
            ],
            [
              { text: '💰 Join Affiliate Program', callback_data: 'affiliate_register' },
              { text: '🤝 Refer Friends', callback_data: 'referral_program' }
            ],
            [
              { text: '📊 View Dashboard', url: 'https://digi-king.com/dashboard' }
            ]
          ]
        }
      };

      let sentCount = 0;
      for (const user of subscribedUsers) {
        try {
          await this.bot.telegram.sendMessage(user.telegramId, launchMessage.text, {
            parse_mode: launchMessage.parse_mode,
            reply_markup: launchMessage.reply_markup
          });
          
          sentCount++;
          
          // Track launch campaign engagement
          await Analytics.create({
            type: 'campaign_sent',
            userId: user.telegramId,
            data: {
              campaignType: 'launch_existing',
              messageType: 'announcement'
            }
          });
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error sending launch message to ${user.telegramId}:`, error);
        }
      }

      this.launchMetrics.campaignsLaunched++;
      this.launchMetrics.subscribersReached += sentCount;
      
      console.log(`✅ Existing subscriber campaign sent to ${sentCount} users`);
      
    } catch (error) {
      console.error('Error in existing subscriber campaign:', error);
    }
  }

  /**
   * Phase 2: Activate affiliate program with recruitment campaign
   */
  async activateAffiliateProgram() {
    try {
      console.log('💰 Phase 2: Activating affiliate program...');
      
      // Find high-value customers for affiliate recruitment
      const potentialAffiliates = await User.find({
        totalSpent: { $gte: 100 },
        segments: { $in: ['returning', 'vip'] },
        isSubscribed: true
      }).limit(50);

      const affiliateInviteMessage = {
        text: (
          '💰 <b>Exclusive Affiliate Invitation!</b>\n\n' +
          'Hi there! We\'ve noticed you\'re one of our valued customers, and we\'d love to invite you to our exclusive affiliate program.\n\n' +
          '🎯 <b>Why Join?</b>\n' +
          '• 💵 Earn up to 20% commission on every sale\n' +
          '• 🏆 Tier-based rewards (Bronze to Platinum)\n' +
          '• 📈 Professional marketing materials provided\n' +
          '• 💳 Monthly payouts via PayPal/Bank/Crypto\n' +
          '• 📊 Real-time analytics dashboard\n\n' +
          '🚀 <b>Launch Bonus:</b> Sign up today and get a $50 bonus after your first referral sale!\n\n' +
          '👆 Ready to start earning? Click below!'
        ),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💰 Join Affiliate Program', callback_data: 'affiliate_register' }
            ],
            [
              { text: '📋 Learn More', callback_data: 'affiliate_info' },
              { text: '❓ FAQ', url: 'https://digi-king.com/affiliate-faq' }
            ]
          ]
        }
      };

      let invitesSent = 0;
      for (const user of potentialAffiliates) {
        try {
          await this.bot.telegram.sendMessage(user.telegramId, affiliateInviteMessage.text, {
            parse_mode: affiliateInviteMessage.parse_mode,
            reply_markup: affiliateInviteMessage.reply_markup
          });
          
          invitesSent++;
          
          await Analytics.create({
            type: 'affiliate_invite_sent',
            userId: user.telegramId,
            data: {
              customerValue: user.totalSpent,
              segment: user.segments
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 150));
          
        } catch (error) {
          console.error(`Error sending affiliate invite to ${user.telegramId}:`, error);
        }
      }

      console.log(`✅ Affiliate invites sent to ${invitesSent} potential affiliates`);
      
    } catch (error) {
      console.error('Error in affiliate program activation:', error);
    }
  }

  /**
   * Phase 3: Promote referral program to all subscribers
   */
  async promoteReferralProgram() {
    try {
      console.log('🤝 Phase 3: Promoting referral program...');
      
      const activeUsers = await User.find({
        isSubscribed: true,
        preferences: { promotions: true },
        lastActiveDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active in last 30 days
      });

      const referralMessage = {
        text: (
          '🤝 <b>Refer Friends, Earn Rewards!</b>\n\n' +
          'Share the love and earn together with our new referral program!\n\n' +
          '🎁 <b>How It Works:</b>\n' +
          '1. 📤 Share your unique referral link\n' +
          '2. 👥 Friends sign up and make their first purchase\n' +
          '3. 💰 You both get rewarded!\n\n' +
          '💵 <b>Rewards:</b>\n' +
          '• 💎 You earn: 10% credit (up to $50 per referral)\n' +
          '• 🎁 They get: 5% discount (up to $25 off)\n' +
          '• 🏆 Bonus: Refer 5 friends, get VIP status!\n\n' +
          '🚀 <b>Launch Special:</b> Double rewards for your first 3 referrals!\n\n' +
          '👆 Get your referral link now!'
        ),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔗 Get My Referral Link', callback_data: 'referral_get_link' }
            ],
            [
              { text: '📊 View My Referrals', callback_data: 'referral_details' },
              { text: '❓ How It Works', callback_data: 'referral_help' }
            ]
          ]
        }
      };

      let referralPromotionsSent = 0;
      for (const user of activeUsers) {
        try {
          await this.bot.telegram.sendMessage(user.telegramId, referralMessage.text, {
            parse_mode: referralMessage.parse_mode,
            reply_markup: referralMessage.reply_markup
          });
          
          referralPromotionsSent++;
          
          await Analytics.create({
            type: 'referral_promotion_sent',
            userId: user.telegramId,
            data: {
              userSegment: user.segments,
              lastActive: user.lastActiveDate
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 120));
          
        } catch (error) {
          console.error(`Error sending referral promotion to ${user.telegramId}:`, error);
        }
      }

      console.log(`✅ Referral promotions sent to ${referralPromotionsSent} active users`);
      
    } catch (error) {
      console.error('Error in referral program promotion:', error);
    }
  }

  /**
   * Phase 4: Launch social media campaign (automated sharing prompts)
   */
  async launchSocialMediaCampaign() {
    try {
      console.log('📱 Phase 4: Launching social media campaign...');
      
      // Find users with high engagement for social promotion
      const influentialUsers = await User.find({
        isSubscribed: true,
        totalPurchases: { $gte: 2 },
        segments: { $in: ['returning', 'vip'] }
      }).limit(25);

      const socialPromotionMessage = {
        text: (
          '📱 <b>Help Us Spread the Word!</b>\n\n' +
          'As one of our valued community members, would you help us share our exciting launch?\n\n' +
          '🎯 <b>Share on Social Media & Get Rewarded:</b>\n' +
          '• 📸 Share our launch post on Instagram/Twitter\n' +
          '• 🏷️ Tag us @DigiKing and use #DigiKingLaunch\n' +
          '• 💰 Get a $20 credit for verified shares!\n\n' +
          '📝 <b>Ready-to-use content:</b>\n' +
          '"Just discovered @DigiKing\'s amazing new features! 🚀 Their affiliate program and referral system are game-changers for digital marketers. Check it out! #DigiKingLaunch #DigitalMarketing"\n\n' +
          '👆 Copy, share, and earn!'
        ),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📸 Share on Instagram', url: 'https://instagram.com/stories/camera' },
              { text: '🐦 Share on Twitter', url: 'https://twitter.com/intent/tweet?text=Just%20discovered%20%40DigiKing%27s%20amazing%20new%20features!' }
            ],
            [
              { text: '📋 Copy Share Text', callback_data: 'copy_share_text' }
            ]
          ]
        }
      };

      let socialPromotionsSent = 0;
      for (const user of influentialUsers) {
        try {
          await this.bot.telegram.sendMessage(user.telegramId, socialPromotionMessage.text, {
            parse_mode: socialPromotionMessage.parse_mode,
            reply_markup: socialPromotionMessage.reply_markup
          });
          
          socialPromotionsSent++;
          
          await Analytics.create({
            type: 'social_promotion_sent',
            userId: user.telegramId,
            data: {
              userValue: user.totalSpent,
              purchases: user.totalPurchases
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`Error sending social promotion to ${user.telegramId}:`, error);
        }
      }

      console.log(`✅ Social media promotions sent to ${socialPromotionsSent} influential users`);
      
    } catch (error) {
      console.error('Error in social media campaign:', error);
    }
  }

  /**
   * Phase 5: Activate email automation sequences
   */
  async activateEmailSequences() {
    try {
      console.log('📧 Phase 5: Activating email automation sequences...');
      
      // Trigger launch announcement email for all subscribers
      const emailSubscribers = await User.find({
        isSubscribed: true,
        email: { $exists: true, $ne: null },
        preferences: { notifications: true }
      });

      for (const user of emailSubscribers) {
        try {
          // Schedule launch announcement email
          await emailAutomationHandler.sendLaunchAnnouncementEmail(user.telegramId, {
            name: user.firstName || 'Valued Customer',
            email: user.email,
            segments: user.segments,
            totalSpent: user.totalSpent
          });
          
          // Schedule follow-up sequence
          await emailAutomationHandler.scheduleLaunchFollowUpSequence(user.telegramId);
          
        } catch (error) {
          console.error(`Error scheduling email for ${user.telegramId}:`, error);
        }
      }

      console.log(`✅ Email sequences activated for ${emailSubscribers.length} subscribers`);
      
    } catch (error) {
      console.error('Error activating email sequences:', error);
    }
  }

  /**
   * Get real-time launch metrics
   */
  async getLaunchMetrics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const metrics = await Analytics.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'purchase'] },
                  '$data.orderValue',
                  0
                ]
              }
            }
          }
        }
      ]);

      const affiliateSignups = await Analytics.countDocuments({
        type: 'affiliate_registered',
        createdAt: { $gte: today }
      });

      const referrals = await Analytics.countDocuments({
        type: 'referral_completed',
        createdAt: { $gte: today }
      });

      return {
        ...this.launchMetrics,
        todayMetrics: metrics,
        affiliateSignups,
        referrals,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error getting launch metrics:', error);
      return this.launchMetrics;
    }
  }
}

module.exports = LaunchManager;

