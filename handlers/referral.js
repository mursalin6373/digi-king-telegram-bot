const Referral = require('../models/Referral');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const discountGenerator = require('../utils/discountGenerator');
const crypto = require('crypto');

class ReferralHandler {
  /**
   * Show referral program information
   * @param {object} ctx - Telegraf context
   */
  async showReferralProgram(ctx) {
    try {
      const user = ctx.user;
      
      if (!user.isSubscribed) {
        await ctx.reply(
          '📧 Subscribe First\n\n' +
          'You need to be subscribed to our newsletter to participate in the referral program.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📧 Subscribe Now', callback_data: 'subscribe_start' }]
              ]
            }
          }
        );
        return;
      }
      
      // Get user's referral stats
      const referralStats = await Referral.getStatsForUser(user.telegramId);
      const totalReferrals = referralStats.reduce((sum, stat) => sum + stat.count, 0);
      const completedReferrals = referralStats.find(s => s._id === 'completed')?.count || 0;
      const totalRewards = referralStats.find(s => s._id === 'completed')?.totalRewards || 0;
      
      const referralCode = this.generateUserReferralCode(user.telegramId);
      const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${referralCode}`;
      
      const programText = (
        '🎁 **Digi-King Referral Program**\n\n' +
        '💰 **How It Works:**\n' +
        '• Share your unique referral link\n' +
        '• Friends sign up and make a purchase\n' +
        '• You both get rewards!\n\n' +
        '🎯 **Rewards:**\n' +
        '• You get: 10% credit (up to $50)\n' +
        '• Friend gets: 5% discount (up to $25)\n' +
        '• Credits expire in 90 days\n\n' +
        `🔗 **Your Referral Code:** \`${referralCode}\`\n\n` +
        '📊 **Your Stats:**\n' +
        `• Total Referrals: ${totalReferrals}\n` +
        `• Successful: ${completedReferrals}\n` +
        `• Total Rewards: $${totalRewards.toFixed(2)}`
      );
      
      const keyboard = [
        [{ text: '🔗 Get Referral Link', callback_data: 'referral_get_link' }],
        [{ text: '📱 Share Link', callback_data: 'referral_share' }],
        [{ text: '📊 View Details', callback_data: 'referral_details' }],
        [{ text: '❓ How It Works', callback_data: 'referral_help' }]
      ];
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(programText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(programText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
      
    } catch (error) {
      console.error('Error in showReferralProgram:', error);
      await ctx.reply('❌ Error loading referral program.');
    }
  }
  
  /**
   * Show referral link
   * @param {object} ctx - Telegraf context
   */
  async getReferralLink(ctx) {
    try {
      const user = ctx.user;
      const referralCode = this.generateUserReferralCode(user.telegramId);
      const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${referralCode}`;
      const webLink = `https://digi-king.com?ref=${referralCode}`;
      
      const linkText = (
        '🔗 **Your Referral Links**\n\n' +
        `🤖 **Telegram Bot:**\n\`${referralLink}\`\n\n` +
        `🌐 **Website:**\n\`${webLink}\`\n\n` +
        '📱 **Share Tips:**\n' +
        '• Send directly to friends\n' +
        '• Post on social media\n' +
        '• Add to your bio/signature\n' +
        '• Include in group chats\n\n' +
        '💡 **Pro Tip:** Personalize your message when sharing!'
      );
      
      await ctx.editMessageText(linkText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Copy Link', callback_data: 'referral_copy_link' }],
            [{ text: '📱 Share on Social', callback_data: 'referral_share_social' }],
            [{ text: '⬅️ Back', callback_data: 'referral_program' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in getReferralLink:', error);
      await ctx.reply('❌ Error generating referral link.');
    }
  }
  
  /**
   * Show detailed referral statistics
   * @param {object} ctx - Telegraf context
   */
  async showReferralDetails(ctx) {
    try {
      const user = ctx.user;
      
      // Get recent referrals
      const recentReferrals = await Referral.find({ referrerUserId: user.telegramId })
        .sort({ createdAt: -1 })
        .limit(10);
      
      const stats = await Referral.getStatsForUser(user.telegramId);
      const completedStats = stats.find(s => s._id === 'completed') || { count: 0, totalRewards: 0, totalOrderValue: 0 };
      const pendingStats = stats.find(s => s._id === 'pending') || { count: 0 };
      
      const conversionRate = (completedStats.count / (completedStats.count + pendingStats.count) * 100) || 0;
      const avgOrderValue = completedStats.count > 0 ? (completedStats.totalOrderValue / completedStats.count) : 0;
      
      let detailsText = (
        '📊 **Detailed Referral Statistics**\n\n' +
        '📈 **Performance:**\n' +
        `• Conversion Rate: ${conversionRate.toFixed(1)}%\n` +
        `• Average Order Value: $${avgOrderValue.toFixed(2)}\n` +
        `• Total Rewards Earned: $${completedStats.totalRewards.toFixed(2)}\n\n`
      );
      
      if (recentReferrals.length > 0) {
        detailsText += '🕒 **Recent Referrals:**\n';
        recentReferrals.forEach((referral, index) => {
          const statusEmoji = {
            pending: '⏳',
            completed: '✅',
            cancelled: '❌'
          }[referral.status];
          
          const date = referral.createdAt.toLocaleDateString();
          const reward = referral.status === 'completed' ? `($${referral.referrerReward.toFixed(2)})` : '';
          
          detailsText += `${index + 1}. ${statusEmoji} ${date} ${reward}\n`;
        });
      } else {
        detailsText += '📝 No referrals yet. Start sharing your link!';
      }
      
      await ctx.editMessageText(detailsText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Get Link', callback_data: 'referral_get_link' }],
            [{ text: '⬅️ Back', callback_data: 'referral_program' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in showReferralDetails:', error);
      await ctx.reply('❌ Error loading referral details.');
    }
  }
  
  /**
   * Show how the referral program works
   * @param {object} ctx - Telegraf context
   */
  async showHowItWorks(ctx) {
    try {
      const helpText = (
        '❓ **How Referral Program Works**\n\n' +
        '**Step 1: Get Your Link**\n' +
        '• Use /referral to get your unique link\n' +
        '• Each user gets a personalized code\n\n' +
        '**Step 2: Share With Friends**\n' +
        '• Send via Telegram, WhatsApp, email\n' +
        '• Post on social media platforms\n' +
        '• Include in your website or blog\n\n' +
        '**Step 3: Friend Signs Up**\n' +
        '• They click your link and subscribe\n' +
        '• Must use the same device/browser\n' +
        '• Referral tracked automatically\n\n' +
        '**Step 4: Friend Makes Purchase**\n' +
        '• Must purchase within 30 days\n' +
        '• Minimum order value: $10\n' +
        '• Both get rewards instantly\n\n' +
        '**Step 5: Enjoy Rewards**\n' +
        '• Credits added to your account\n' +
        '• Use for future purchases\n' +
        '• Valid for 90 days\n\n' +
        '🎯 **Tips for Success:**\n' +
        '• Personalize your sharing message\n' +
        '• Explain the benefits to friends\n' +
        '• Share during sales/promotions\n' +
        '• Follow up with interested friends'
      );
      
      await ctx.editMessageText(helpText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Get My Link', callback_data: 'referral_get_link' }],
            [{ text: '⬅️ Back', callback_data: 'referral_program' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in showHowItWorks:', error);
      await ctx.reply('❌ Error loading help information.');
    }
  }
  
  /**
   * Process referral when someone uses a referral link
   * @param {string} referralCode - The referral code used
   * @param {string} newUserId - New user's Telegram ID
   */
  async processReferralSignup(referralCode, newUserId) {
    try {
      // Extract user ID from referral code
      const referrerUserId = this.extractUserIdFromCode(referralCode);
      if (!referrerUserId) {
        console.log(`Invalid referral code format: ${referralCode}`);
        return null;
      }
      
      // Check if referrer exists and is subscribed
      const referrer = await User.findOne({ 
        telegramId: referrerUserId,
        isSubscribed: true
      });
      
      if (!referrer) {
        console.log(`Referrer not found or not subscribed: ${referrerUserId}`);
        return null;
      }
      
      // Check if this referral already exists
      const existingReferral = await Referral.findOne({
        referrerUserId,
        referredUserId: newUserId
      });
      
      if (existingReferral) {
        console.log(`Referral already exists: ${referrerUserId} -> ${newUserId}`);
        return existingReferral;
      }
      
      // Create new referral
      const referral = new Referral({
        referralCode,
        referrerUserId,
        referredUserId: newUserId,
        status: 'pending'
      });
      
      await referral.save();
      
      // Track referral in analytics
      await Analytics.create({
        type: 'referral_signup',
        userId: newUserId,
        data: {
          referralCode,
          referrerUserId,
          source: 'telegram'
        }
      });
      
      console.log(`✅ Referral created: ${referrerUserId} -> ${newUserId}`);
      return referral;
      
    } catch (error) {
      console.error('Error processing referral signup:', error);
      return null;
    }
  }
  
  /**
   * Complete referral when referred user makes a purchase
   * @param {string} userId - User who made the purchase
   * @param {number} orderValue - Order value
   * @param {string} orderId - Order ID
   */
  async completeReferral(userId, orderValue, orderId) {
    try {
      // Find pending referral for this user
      const referral = await Referral.findOne({
        referredUserId: userId,
        status: 'pending'
      });
      
      if (!referral) {
        console.log(`No pending referral found for user: ${userId}`);
        return;
      }
      
      if (referral.isExpired()) {
        console.log(`Referral expired for user: ${userId}`);
        referral.cancel();
        await referral.save();
        return;
      }
      
      // Complete the referral
      referral.complete(orderValue, orderId);
      await referral.save();
      
      // Add credits to both users
      await this.addCreditsToUsers(referral);
      
      // Track completion
      await Analytics.create({
        type: 'referral_completed',
        userId: referral.referredUserId,
        data: {
          referrerUserId: referral.referrerUserId,
          orderValue,
          orderId,
          referrerReward: referral.referrerReward,
          referredReward: referral.referredReward
        }
      });
      
      console.log(`🎉 Referral completed: ${referral.referrerUserId} -> ${userId} ($${orderValue})`);
      
    } catch (error) {
      console.error('Error completing referral:', error);
    }
  }
  
  /**
   * Add credits to both referrer and referred users
   * @param {object} referral - Referral object
   */
  async addCreditsToUsers(referral) {
    try {
      // Add credit to referrer
      const referrer = await User.findOne({ telegramId: referral.referrerUserId });
      if (referrer) {
        if (!referrer.credits) referrer.credits = 0;
        referrer.credits += referral.referrerReward;
        await referrer.save();
      }
      
      // Add credit to referred user
      const referred = await User.findOne({ telegramId: referral.referredUserId });
      if (referred) {
        if (!referred.credits) referred.credits = 0;
        referred.credits += referral.referredReward;
        await referred.save();
      }
      
      console.log(`💰 Credits added - Referrer: $${referral.referrerReward}, Referred: $${referral.referredReward}`);
      
    } catch (error) {
      console.error('Error adding credits to users:', error);
    }
  }
  
  /**
   * Generate referral code for user
   * @param {string} telegramId - User's Telegram ID
   * @returns {string} Referral code
   */
  generateUserReferralCode(telegramId) {
    // Create a hash that can be reversed to get the user ID
    const hash = crypto.createHash('md5').update(telegramId).digest('hex');
    return `USER${hash.substring(0, 6).toUpperCase()}`;
  }
  
  /**
   * Extract user ID from referral code
   * @param {string} referralCode - Referral code
   * @returns {string|null} User ID or null if invalid
   */
  extractUserIdFromCode(referralCode) {
    // This is a simplified version - in production you'd need a more robust mapping
    // For now, we'll search the database
    return null; // This would need to be implemented with a proper mapping system
  }
  
  /**
   * Send welcome message to referred user with discount
   * @param {string} userId - New user's Telegram ID
   * @param {object} referral - Referral object
   */
  async sendReferredUserWelcome(userId, referral) {
    try {
      // Generate welcome discount for referred user
      const discountCode = discountGenerator.generateDiscountCode({
        percentage: 15,
        expiryDays: 30,
        segments: ['new_customer']
      });
      
      const welcomeText = (
        '🎉 **Welcome via Referral!**\n\n' +
        'You\'ve been referred by a friend to Digi-King!\n\n' +
        '🎁 **Your Welcome Bonus:**\n' +
        `• Discount Code: \`${discountCode.code}\`\n` +
        `• ${discountCode.percentage}% off your first order\n` +
        `• Valid for ${discountCode.expiryDays} days\n\n` +
        '🤝 **What happens next:**\n' +
        '• Make a purchase using your discount\n' +
        '• You\'ll get additional rewards\n' +
        '• Your friend gets rewards too!\n\n' +
        'Start shopping now and save!'
      );
      
      // Note: In a real implementation, you'd need access to the bot instance
      // to send messages. This would typically be injected or accessed differently.
      console.log(`Would send welcome message to ${userId}:`, welcomeText);
      
    } catch (error) {
      console.error('Error sending referred user welcome:', error);
    }
  }
  
  /**
   * Notify referrer when someone uses their link
   * @param {string} referrerUserId - Referrer's Telegram ID
   * @param {object} referral - Referral object
   */
  async notifyReferrer(referrerUserId, referral) {
    try {
      const notificationText = (
        '🎉 **New Referral!**\n\n' +
        'Someone just signed up using your referral link!\n\n' +
        '⏳ **Next Steps:**\n' +
        '• They need to make a purchase within 30 days\n' +
        '• You\'ll both get rewards when they do\n' +
        '• Track progress in /referral\n\n' +
        '💡 **Tip:** Follow up with your friend to help them find what they need!'
      );
      
      // Note: In a real implementation, you'd send this via the bot
      console.log(`Would notify referrer ${referrerUserId}:`, notificationText);
      
    } catch (error) {
      console.error('Error notifying referrer:', error);
    }
  }
}

module.exports = new ReferralHandler();

