const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const crypto = require('crypto');

class AffiliateHandler {
  /**
   * Handle affiliate registration
   * @param {object} ctx - Telegraf context
   */
  async registerAffiliate(ctx) {
    try {
      const user = ctx.user;
      
      // Check if user is already an affiliate
      const existingAffiliate = await Affiliate.findOne({ telegramId: user.telegramId });
      if (existingAffiliate) {
        await ctx.reply(
          '🎯 You are already registered as an affiliate!\n\n' +
          `Your referral code: \`${existingAffiliate.referralCode}\`\n` +
          `Status: ${existingAffiliate.status}\n` +
          `Tier: ${existingAffiliate.tier}\n\n` +
          'Use /affiliate to manage your affiliate account.',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📊 View Dashboard', callback_data: 'affiliate_dashboard' }],
                [{ text: '🔗 Get Referral Link', callback_data: 'affiliate_get_link' }]
              ]
            }
          }
        );
        return;
      }
      
      // Check if user has email (required for affiliate program)
      if (!user.email) {
        await ctx.reply(
          '📧 Email Required for Affiliate Program\n\n' +
          'To join our affiliate program, you need to have a verified email address. ' +
          'Please subscribe to our newsletter first to provide your email.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📧 Subscribe & Add Email', callback_data: 'subscribe_start' }]
              ]
            }
          }
        );
        return;
      }
      
      await ctx.reply(
        '🎯 **Welcome to Digi-King Affiliate Program!**\n\n' +
        '💰 **Benefits:**\n' +
        '• Earn 10-20% commission on every sale\n' +
        '• Tiered commission structure\n' +
        '• Real-time tracking and analytics\n' +
        '• Marketing materials provided\n' +
        '• Monthly payouts\n\n' +
        '📋 **Requirements:**\n' +
        '• Must be 18+ years old\n' +
        '• Agree to our affiliate terms\n' +
        '• Provide tax information if earnings exceed $600/year\n\n' +
        'Do you want to continue with the registration?',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Yes, Register Me', callback_data: 'affiliate_confirm_register' }],
              [{ text: '📜 View Terms', url: 'https://digi-king.com/affiliate-terms' }],
              [{ text: '❌ Maybe Later', callback_data: 'affiliate_cancel_register' }]
            ]
          }
        }
      );
      
    } catch (error) {
      console.error('Error in registerAffiliate:', error);
      await ctx.reply('❌ Error registering for affiliate program. Please try again.');
    }
  }
  
  /**
   * Confirm affiliate registration
   * @param {object} ctx - Telegraf context
   */
  async confirmRegistration(ctx) {
    try {
      const user = ctx.user;
      
      // Generate unique referral code
      const referralCode = this.generateReferralCode(user.telegramId);
      
      // Create affiliate account
      const affiliate = new Affiliate({
        telegramId: user.telegramId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        referralCode,
        status: 'pending' // Requires manual approval
      });
      
      await affiliate.save();
      
      await ctx.editMessageText(
        '🎉 **Registration Submitted Successfully!**\n\n' +
        `📧 Email: ${user.email}\n` +
        `🔗 Your Referral Code: \`${referralCode}\`\n\n` +
        '⏳ **Next Steps:**\n' +
        '• Your application is under review\n' +
        '• We\'ll notify you within 24-48 hours\n' +
        '• You\'ll receive an email with further instructions\n\n' +
        '📞 Questions? Contact affiliate@digi-king.com',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Check Status', callback_data: 'affiliate_check_status' }]
            ]
          }
        }
      );
      
      // Track affiliate registration
      await Analytics.create({
        type: 'affiliate_registration',
        userId: user.telegramId,
        data: {
          email: user.email,
          referralCode,
          status: 'pending'
        }
      });
      
      console.log(`🎯 New affiliate registered: ${user.telegramId} (${referralCode})`);
      
    } catch (error) {
      console.error('Error in confirmRegistration:', error);
      await ctx.reply('❌ Error completing registration. Please try again.');
    }
  }
  
  /**
   * Show affiliate dashboard
   * @param {object} ctx - Telegraf context
   */
  async showDashboard(ctx) {
    try {
      const user = ctx.user;
      const affiliate = await Affiliate.findOne({ telegramId: user.telegramId });
      
      if (!affiliate) {
        await ctx.reply(
          '❌ You are not registered as an affiliate.\n\n' +
          'Would you like to join our affiliate program?',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎯 Join Affiliate Program', callback_data: 'affiliate_register' }]
              ]
            }
          }
        );
        return;
      }
      
      const statusEmoji = {
        pending: '⏳',
        active: '✅',
        suspended: '⚠️',
        terminated: '❌'
      }[affiliate.status];
      
      const tierEmoji = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎'
      }[affiliate.tier];
      
      const dashboardText = (
        '🎯 **Affiliate Dashboard**\n\n' +
        `${statusEmoji} Status: ${affiliate.status.toUpperCase()}\n` +
        `${tierEmoji} Tier: ${affiliate.tier.toUpperCase()}\n` +
        `💰 Commission Rate: ${(affiliate.commissionRate * 100).toFixed(1)}%\n\n` +
        `🔗 Referral Code: \`${affiliate.referralCode}\`\n\n` +
        '📊 **Performance:**\n' +
        `• Total Referrals: ${affiliate.performance.totalReferrals}\n` +
        `• Successful: ${affiliate.performance.successfulReferrals}\n` +
        `• Conversion Rate: ${(affiliate.performance.conversionRate * 100).toFixed(2)}%\n\n` +
        '💵 **Earnings:**\n' +
        `• Total: $${affiliate.performance.totalEarnings.toFixed(2)}\n` +
        `• Pending: $${affiliate.performance.pendingEarnings.toFixed(2)}\n` +
        `• Paid: $${affiliate.performance.paidEarnings.toFixed(2)}`
      );
      
      const keyboard = [
        [
          { text: '🔗 Get Links', callback_data: 'affiliate_get_link' },
          { text: '📈 Analytics', callback_data: 'affiliate_analytics' }
        ],
        [
          { text: '💳 Request Payout', callback_data: 'affiliate_request_payout' },
          { text: '📦 Marketing Kit', callback_data: 'affiliate_marketing_kit' }
        ],
        [
          { text: '⚙️ Settings', callback_data: 'affiliate_settings' },
          { text: '🔄 Refresh', callback_data: 'affiliate_dashboard' }
        ]
      ];
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(dashboardText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(dashboardText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
      
    } catch (error) {
      console.error('Error in showDashboard:', error);
      await ctx.reply('❌ Error loading affiliate dashboard.');
    }
  }
  
  /**
   * Generate referral links
   * @param {object} ctx - Telegraf context
   */
  async getReferralLinks(ctx) {
    try {
      const user = ctx.user;
      const affiliate = await Affiliate.findOne({ telegramId: user.telegramId });
      
      if (!affiliate || affiliate.status !== 'active') {
        await ctx.reply('❌ Your affiliate account is not active.');
        return;
      }
      
      const baseUrl = 'https://digi-king.com';
      const referralCode = affiliate.referralCode;
      
      const links = {
        general: `${baseUrl}?ref=${referralCode}`,
        shop: `${baseUrl}/shop?ref=${referralCode}`,
        products: `${baseUrl}/products?ref=${referralCode}`,
        telegram: `https://t.me/${process.env.BOT_USERNAME}?start=ref_${referralCode}`
      };
      
      const linksText = (
        '🔗 **Your Referral Links**\n\n' +
        `🏠 **Homepage:**\n\`${links.general}\`\n\n` +
        `🛍 **Shop:**\n\`${links.shop}\`\n\n` +
        `📦 **Products:**\n\`${links.products}\`\n\n` +
        `🤖 **Telegram Bot:**\n\`${links.telegram}\`\n\n` +
        '💡 **Tips:**\n' +
        '• Share on social media\n' +
        '• Include in email signatures\n' +
        '• Add to your website/blog\n' +
        '• Use UTM tracking for better analytics'
      );
      
      await ctx.editMessageText(linksText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Share on Social', callback_data: 'affiliate_share_social' }],
            [{ text: '📧 Email Template', callback_data: 'affiliate_email_template' }],
            [{ text: '⬅️ Back to Dashboard', callback_data: 'affiliate_dashboard' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in getReferralLinks:', error);
      await ctx.reply('❌ Error generating referral links.');
    }
  }
  
  /**
   * Handle payout request
   * @param {object} ctx - Telegraf context
   */
  async requestPayout(ctx) {
    try {
      const user = ctx.user;
      const affiliate = await Affiliate.findOne({ telegramId: user.telegramId });
      
      if (!affiliate || affiliate.status !== 'active') {
        await ctx.reply('❌ Your affiliate account is not active.');
        return;
      }
      
      if (!affiliate.canRequestPayout()) {
        await ctx.reply(
          '❌ **Minimum Payout Not Reached**\n\n' +
          `Current earnings: $${affiliate.performance.totalEarnings.toFixed(2)}\n` +
          'Minimum payout: $100.00\n\n' +
          `You need $${(100 - affiliate.performance.totalEarnings).toFixed(2)} more to request a payout.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      const payoutText = (
        '💳 **Request Payout**\n\n' +
        `💰 Available Earnings: $${affiliate.performance.totalEarnings.toFixed(2)}\n` +
        `💵 Minimum Payout: $100.00\n\n` +
        '**Payment Methods:**\n' +
        '• PayPal (1-3 business days)\n' +
        '• Bank Transfer (3-5 business days)\n' +
        '• Crypto (1-24 hours)\n\n' +
        'Choose your preferred payment method:'
      );
      
      await ctx.editMessageText(payoutText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 PayPal', callback_data: 'payout_paypal' }],
            [{ text: '🏦 Bank Transfer', callback_data: 'payout_bank' }],
            [{ text: '₿ Cryptocurrency', callback_data: 'payout_crypto' }],
            [{ text: '⬅️ Back', callback_data: 'affiliate_dashboard' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in requestPayout:', error);
      await ctx.reply('❌ Error processing payout request.');
    }
  }
  
  /**
   * Show marketing materials
   * @param {object} ctx - Telegraf context
   */
  async showMarketingKit(ctx) {
    try {
      const user = ctx.user;
      const affiliate = await Affiliate.findOne({ telegramId: user.telegramId });
      
      if (!affiliate || affiliate.status !== 'active') {
        await ctx.reply('❌ Your affiliate account is not active.');
        return;
      }
      
      const accessLevel = affiliate.marketingMaterials.accessLevel;
      
      const kitText = (
        '📦 **Marketing Kit**\n\n' +
        `🎯 Access Level: ${accessLevel.toUpperCase()}\n\n` +
        '**Available Materials:**\n' +
        '• Product banners (various sizes)\n' +
        '• Email templates\n' +
        '• Social media posts\n' +
        '• Product descriptions\n' +
        '• Logo and brand assets\n\n' +
        '💡 **Best Practices:**\n' +
        '• Use high-quality images\n' +
        '• Include your referral code\n' +
        '• Be authentic in your promotions\n' +
        '• Follow FTC disclosure guidelines'
      );
      
      const keyboard = [
        [{ text: '🖼 Download Banners', callback_data: 'download_banners' }],
        [{ text: '📧 Email Templates', callback_data: 'download_email_templates' }],
        [{ text: '📱 Social Media Kit', callback_data: 'download_social_kit' }],
        [{ text: '⬅️ Back to Dashboard', callback_data: 'affiliate_dashboard' }]
      ];
      
      await ctx.editMessageText(kitText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      
    } catch (error) {
      console.error('Error in showMarketingKit:', error);
      await ctx.reply('❌ Error loading marketing kit.');
    }
  }
  
  /**
   * Process referral when user signs up with referral code
   * @param {string} referralCode - Referral code
   * @param {string} newUserId - New user's Telegram ID
   */
  async processReferral(referralCode, newUserId) {
    try {
      const affiliate = await Affiliate.findOne({ 
        referralCode,
        status: 'active'
      });
      
      if (!affiliate) {
        console.log(`Invalid or inactive referral code: ${referralCode}`);
        return null;
      }
      
      // Add referral to affiliate (without order value initially)
      affiliate.addReferral(newUserId, 0);
      await affiliate.save();
      
      // Track referral in analytics
      await Analytics.create({
        type: 'referral_signup',
        userId: newUserId,
        data: {
          referralCode,
          affiliateId: affiliate.affiliateId,
          referrerUserId: affiliate.telegramId
        }
      });
      
      console.log(`✅ Referral processed: ${referralCode} -> ${newUserId}`);
      return affiliate;
      
    } catch (error) {
      console.error('Error processing referral:', error);
      return null;
    }
  }
  
  /**
   * Confirm referral when referred user makes a purchase
   * @param {string} userId - User who made the purchase
   * @param {number} orderValue - Value of the order
   */
  async confirmReferralPurchase(userId, orderValue) {
    try {
      const affiliate = await Affiliate.findOne({
        'referrals.userId': userId,
        'referrals.status': 'pending'
      });
      
      if (!affiliate) {
        console.log(`No pending referral found for user: ${userId}`);
        return;
      }
      
      // Confirm the referral and update commission
      affiliate.confirmReferral(userId, orderValue);
      await affiliate.save();
      
      // Track commission earned
      await Analytics.create({
        type: 'affiliate_commission',
        userId: affiliate.telegramId,
        data: {
          referredUserId: userId,
          orderValue,
          commission: orderValue * affiliate.commissionRate,
          tier: affiliate.tier
        }
      });
      
      console.log(`💰 Commission earned: ${affiliate.telegramId} -> $${(orderValue * affiliate.commissionRate).toFixed(2)}`);
      
    } catch (error) {
      console.error('Error confirming referral purchase:', error);
    }
  }
  
  /**
   * Generate unique referral code
   * @param {string} telegramId - User's Telegram ID
   * @returns {string} Unique referral code
   */
  generateReferralCode(telegramId) {
    const hash = crypto.createHash('md5').update(telegramId + Date.now()).digest('hex');
    return `DK${hash.substring(0, 6).toUpperCase()}`;
  }
}

module.exports = new AffiliateHandler();

