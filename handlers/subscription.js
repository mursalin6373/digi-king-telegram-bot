const User = require('../models/User');
const Analytics = require('../models/Analytics');
const emailValidator = require('../utils/emailValidator');
const rateLimit = require('../middleware/rateLimit');

class SubscriptionHandler {
  /**
   * Handle /subscribe command
   * @param {object} ctx - Telegraf context
   */
  async subscribe(ctx) {
    try {
      const user = ctx.user;
      
      if (user.isSubscribed) {
        await ctx.reply(
          '✅ You are already subscribed to our mailing list!\n\n' +
          'You\'ll receive updates about new products, special offers, and exclusive discounts.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📊 View My Profile', callback_data: 'view_profile' }],
                [{ text: '⚙️ Manage Preferences', callback_data: 'manage_preferences' }]
              ]
            }
          }
        );
        return;
      }

      await ctx.reply(
        '📧 <b>Welcome to Digi-King Newsletter!</b>\n\n' +
        'Join our exclusive mailing list to receive:\n' +
        '• Special discount codes\n' +
        '• Early access to new products\n' +
        '• Exclusive promotions\n' +
        '• Industry insights and tips\n\n' +
        '📋 <b>Privacy Notice:</b>\n' +
        'We respect your privacy and will only use your email for sending newsletters and promotional content. ' +
        'You can unsubscribe at any time. By subscribing, you agree to our Privacy Policy and Terms of Service.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 Privacy Policy', url: 'https://digi-king.com/privacy' },
                { text: '📜 Terms of Service', url: 'https://digi-king.com/terms' }
              ],
              [
                { text: '✅ I Agree - Subscribe', callback_data: 'consent_and_subscribe' }
              ],
              [
                { text: '❌ Cancel', callback_data: 'cancel_subscription' }
              ]
            ]
          }
        }
      );
      
      // Track subscription start
      await Analytics.create({
        type: 'subscription',
        userId: user.telegramId,
        data: { action: 'subscription_started' }
      });
    } catch (error) {
      console.error('Error in subscribe handler:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  }

  /**
   * Handle consent and subscription confirmation
   * @param {object} ctx - Telegraf context
   */
  async consentAndSubscribe(ctx) {
    try {
      const user = ctx.user;
      
      // Update consent
      user.consentGiven = true;
      user.marketingConsent = true;
      user.consentTimestamp = new Date();
      await user.save();
      
      await ctx.editMessageText(
        '✅ <b>Thank you for giving consent!</b>\n\n' +
        'Now, please provide your email address to complete the subscription process.\n\n' +
        '📝 Simply type your email address in the next message.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '❌ Cancel', callback_data: 'cancel_subscription' }
            ]]
          }
        }
      );
      
      // Set user state to waiting for email
      user.waitingForEmail = true;
      await user.save();
      
    } catch (error) {
      console.error('Error in consentAndSubscribe handler:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  }

  /**
   * Handle email submission
   * @param {object} ctx - Telegraf context
   */
  async handleEmailSubmission(ctx) {
    try {
      const user = ctx.user;
      const emailText = ctx.message.text.trim();
      
      // Validate email
      const validation = await emailValidator.advancedValidation(emailText);
      
      if (!validation.isValid) {
        const suggestion = emailValidator.suggestCorrection(emailText);
        let message = `❌ Invalid email address: ${validation.errors.join(', ')}`;
        
        if (suggestion) {
          message += `\n\n💡 Did you mean: <code>${suggestion}</code>?`;
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✅ Use ${suggestion}`, callback_data: `use_email:${suggestion}` }],
                [{ text: '✏️ Try Again', callback_data: 'try_email_again' }],
                [{ text: '❌ Cancel', callback_data: 'cancel_subscription' }]
              ]
            }
          });
        } else {
          message += '\n\nPlease provide a valid email address.';
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '❌ Cancel', callback_data: 'cancel_subscription' }
              ]]
            }
          });
        }
        return;
      }
      
      // Check if email is already used by another user
      const existingUser = await User.findOne({ 
        email: validation.email,
        telegramId: { $ne: user.telegramId }
      });
      
      if (existingUser) {
        await ctx.reply(
          '⚠️ This email address is already registered with another account.\n\n' +
          'Please use a different email address or contact support if this is your email.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '✏️ Try Different Email', callback_data: 'try_email_again' }],
                [{ text: '📞 Contact Support', url: 'https://digi-king.com/support' }],
                [{ text: '❌ Cancel', callback_data: 'cancel_subscription' }]
              ]
            }
          }
        );
        return;
      }
      
      // Save email and complete subscription
      user.email = validation.email;
      user.subscribe();
      user.waitingForEmail = false;
      user.updateSegment();
      await user.save();
      
      await ctx.reply(
        `🎉 <b>Welcome to Digi-King!</b>\n\n` +
        `✅ Successfully subscribed with email: <code>${validation.email}</code>\n\n` +
        `You'll now receive:\n` +
        `• Exclusive discount codes\n` +
        `• New product announcements\n` +
        `• Special promotions\n` +
        `• Personalized offers\n\n` +
        `🎁 <b>Welcome Gift:</b> Check out your personalized discount code below!`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Get Welcome Discount', callback_data: 'get_welcome_discount' }],
              [{ text: '📊 View Profile', callback_data: 'view_profile' }],
              [{ text: '⚙️ Manage Preferences', callback_data: 'manage_preferences' }]
            ]
          }
        }
      );
      
      // Track successful subscription
      await Analytics.create({
        type: 'subscription',
        userId: user.telegramId,
        data: { 
          action: 'subscription_completed',
          email: validation.email,
          segment: user.segments[0]
        }
      });
      
      // Trigger welcome email sequence
      const emailAutomationHandler = require('./emailAutomation');
      await emailAutomationHandler.sendWelcomeSequence(user.telegramId);
      
      // Track conversion funnel stage
      const conversionFunnelHandler = require('./conversionFunnel');
      await conversionFunnelHandler.trackFunnelStage(user.telegramId, 'interest', {
        source: 'telegram',
        action: 'email_subscription'
      });
      
      console.log(`✅ User ${user.telegramId} subscribed with email: ${validation.email}`);
      
    } catch (error) {
      console.error('Error in handleEmailSubmission:', error);
      await ctx.reply('❌ An error occurred while processing your email. Please try again.');
    }
  }

  /**
   * Handle /unsubscribe command
   * @param {object} ctx - Telegraf context
   */
  async unsubscribe(ctx) {
    try {
      const user = ctx.user;
      
      if (!user.isSubscribed) {
        await ctx.reply(
          '📫 You are not currently subscribed to our mailing list.\n\n' +
          'Would you like to subscribe to receive exclusive offers and updates?',
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '📧 Subscribe Now', callback_data: 'consent_and_subscribe' }
              ]]
            }
          }
        );
        return;
      }
      
      await ctx.reply(
        '😔 We\'re sorry to see you go!\n\n' +
        'Are you sure you want to unsubscribe from our mailing list? You\'ll miss out on:\n' +
        '• Exclusive discount codes\n' +
        '• Early access to new products\n' +
        '• Special promotions\n\n' +
        'You can always re-subscribe later.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Yes, Unsubscribe', callback_data: 'confirm_unsubscribe' }],
              [{ text: '❌ No, Keep Subscription', callback_data: 'cancel_unsubscribe' }],
              [{ text: '⚙️ Just Update Preferences', callback_data: 'manage_preferences' }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Error in unsubscribe handler:', error);
      await ctx.reply('❌ An error occurred. Please try again later.');
    }
  }

  /**
   * Confirm unsubscription
   * @param {object} ctx - Telegraf context
   */
  async confirmUnsubscribe(ctx) {
    try {
      const user = ctx.user;
      
      user.unsubscribe();
      await user.save();
      
      await ctx.editMessageText(
        '✅ <b>Successfully unsubscribed</b>\n\n' +
        'You have been removed from our mailing list. We\'re sorry to see you go!\n\n' +
        'If you change your mind, you can always re-subscribe using /subscribe.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '📧 Re-subscribe', callback_data: 'consent_and_subscribe' }
            ]]
          }
        }
      );
      
      // Track unsubscription
      await Analytics.create({
        type: 'unsubscription',
        userId: user.telegramId,
        data: { 
          action: 'unsubscribed',
          previouslySubscribed: true
        }
      });
      
      console.log(`❌ User ${user.telegramId} unsubscribed`);
      
    } catch (error) {
      console.error('Error in confirmUnsubscribe:', error);
      await ctx.reply('❌ An error occurred while unsubscribing. Please try again.');
    }
  }

  /**
   * Handle email confirmation via callback
   * @param {object} ctx - Telegraf context
   */
  async useEmail(ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      const email = callbackData.split(':')[1];
      
      if (!email) {
        await ctx.answerCbQuery('Invalid email data');
        return;
      }
      
      // Simulate message with the suggested email
      ctx.message = { text: email };
      await this.handleEmailSubmission(ctx);
      
    } catch (error) {
      console.error('Error in useEmail handler:', error);
      await ctx.answerCbQuery('An error occurred');
    }
  }

  /**
   * Handle preference management
   * @param {object} ctx - Telegraf context
   */
  async managePreferences(ctx) {
    try {
      const user = ctx.user;
      
      if (!user.isSubscribed) {
        await ctx.reply('You need to be subscribed to manage preferences.');
        return;
      }
      
      const prefsText = (
        '⚙️ <b>Manage Your Preferences</b>\n\n' +
        `🔔 Notifications: ${user.preferences.notifications ? '✅ Enabled' : '❌ Disabled'}\n` +
        `🎁 Promotions: ${user.preferences.promotions ? '✅ Enabled' : '❌ Disabled'}\n` +
        `🆕 New Products: ${user.preferences.newProducts ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        'Toggle the settings below to customize what you receive:'
      );
      
      const keyboard = [
        [{
          text: `${user.preferences.notifications ? '❌ Disable' : '✅ Enable'} Notifications`,
          callback_data: 'toggle_notifications'
        }],
        [{
          text: `${user.preferences.promotions ? '❌ Disable' : '✅ Enable'} Promotions`,
          callback_data: 'toggle_promotions'
        }],
        [{
          text: `${user.preferences.newProducts ? '❌ Disable' : '✅ Enable'} New Products`,
          callback_data: 'toggle_new_products'
        }],
        [{ text: '✅ Save Preferences', callback_data: 'save_preferences' }]
      ];
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(prefsText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(prefsText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
      
    } catch (error) {
      console.error('Error in managePreferences:', error);
      await ctx.reply('❌ An error occurred while loading preferences.');
    }
  }
}

module.exports = new SubscriptionHandler();

