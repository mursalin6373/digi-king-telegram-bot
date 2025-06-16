const User = require('../models/User');
const Analytics = require('../models/Analytics');

class AuthMiddleware {
  constructor() {
    this.adminUserIds = process.env.ADMIN_USER_IDS ? 
      process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : [];
  }

  /**
   * Middleware to ensure user exists in database
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async ensureUser(ctx, next) {
    try {
      const telegramId = ctx.from.id.toString();
      const userData = {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        language: ctx.from.language_code || 'en'
      };

      // Find or create user
      let user = await User.findOne({ telegramId });
      
      if (!user) {
        user = new User({
          telegramId,
          ...userData,
          segments: ['new_customer']
        });
        await user.save();
        
        console.log(`🆕 New user registered: ${telegramId}`);
      } else {
        // Update user info if changed
        let hasChanges = false;
        
        Object.keys(userData).forEach(key => {
          if (userData[key] && user[key] !== userData[key]) {
            user[key] = userData[key];
            hasChanges = true;
          }
        });
        
        // Update last interaction
        user.lastInteraction = new Date();
        user.botBlocked = false; // Reset if they're interacting
        hasChanges = true;
        
        if (hasChanges) {
          await user.save();
        }
      }

      // Attach user to context
      ctx.user = user;
      
      // Log user interaction
      await Analytics.create({
        type: 'user_interaction',
        userId: telegramId,
        data: {
          command: ctx.message?.text || ctx.callbackQuery?.data,
          messageType: ctx.message ? 'message' : 'callback_query'
        },
        metadata: {
          source: 'telegram',
          timestamp: new Date()
        }
      });
      
      return next();
    } catch (error) {
      console.error('Error in ensureUser middleware:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  }

  /**
   * Middleware to check if user is admin
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async requireAdmin(ctx, next) {
    try {
      const userId = ctx.from.id.toString();
      
      if (!this.adminUserIds.includes(userId)) {
        await ctx.reply('❌ Access denied. Admin privileges required.');
        return;
      }
      
      return next();
    } catch (error) {
      console.error('Error in requireAdmin middleware:', error);
      await ctx.reply('❌ An error occurred while checking admin privileges.');
    }
  }

  /**
   * Middleware to check if user is subscribed
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async requireSubscribed(ctx, next) {
    try {
      if (!ctx.user) {
        await this.ensureUser(ctx, () => {});
      }
      
      if (!ctx.user.isSubscribed) {
        await ctx.reply(
          '📧 You need to be subscribed to use this feature. Use /subscribe to join our mailing list!',
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '📧 Subscribe Now', callback_data: 'subscribe_start' }
              ]]
            }
          }
        );
        return;
      }
      
      return next();
    } catch (error) {
      console.error('Error in requireSubscribed middleware:', error);
      await ctx.reply('❌ An error occurred while checking subscription status.');
    }
  }

  /**
   * Middleware to check if user has given consent
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async requireConsent(ctx, next) {
    try {
      if (!ctx.user) {
        await this.ensureUser(ctx, () => {});
      }
      
      if (!ctx.user.consentGiven) {
        await ctx.reply(
          '📋 You need to give consent to use this feature. Please review our privacy policy first.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📋 Privacy Policy', url: 'https://digi-king.com/privacy' },
                  { text: '✅ Give Consent', callback_data: 'give_consent' }
                ]
              ]
            }
          }
        );
        return;
      }
      
      return next();
    } catch (error) {
      console.error('Error in requireConsent middleware:', error);
      await ctx.reply('❌ An error occurred while checking consent status.');
    }
  }

  /**
   * Check if user is admin (without middleware)
   * @param {string} userId - Telegram user ID
   * @returns {boolean} True if user is admin
   */
  isAdmin(userId) {
    return this.adminUserIds.includes(userId.toString());
  }

  /**
   * Add admin user
   * @param {string} userId - Telegram user ID to add as admin
   */
  addAdmin(userId) {
    const userIdStr = userId.toString();
    if (!this.adminUserIds.includes(userIdStr)) {
      this.adminUserIds.push(userIdStr);
    }
  }

  /**
   * Remove admin user
   * @param {string} userId - Telegram user ID to remove from admin
   */
  removeAdmin(userId) {
    const userIdStr = userId.toString();
    const index = this.adminUserIds.indexOf(userIdStr);
    if (index > -1) {
      this.adminUserIds.splice(index, 1);
    }
  }

  /**
   * Get list of admin user IDs
   * @returns {string[]} Array of admin user IDs
   */
  getAdminIds() {
    return [...this.adminUserIds];
  }

  /**
   * Middleware to check if bot is blocked by user
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async checkBlocked(ctx, next) {
    try {
      if (ctx.user && ctx.user.botBlocked) {
        // User was marked as blocked but is now interacting
        ctx.user.botBlocked = false;
        await ctx.user.save();
      }
      
      return next();
    } catch (error) {
      console.error('Error in checkBlocked middleware:', error);
      return next();
    }
  }

  /**
   * Mark user as having blocked the bot
   * @param {string} userId - Telegram user ID
   */
  async markUserBlocked(userId) {
    try {
      await User.updateOne(
        { telegramId: userId },
        { 
          botBlocked: true,
          lastInteraction: new Date()
        }
      );
    } catch (error) {
      console.error('Error marking user as blocked:', error);
    }
  }
}

module.exports = new AuthMiddleware();

