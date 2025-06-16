const { RateLimiterMemory } = require('rate-limiter-flexible');

class RateLimitMiddleware {
  constructor() {
    // Rate limiter for general commands
    this.generalLimiter = new RateLimiterMemory({
      points: 10, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60 // Block for 60 seconds if limit exceeded
    });

    // Rate limiter for subscription actions
    this.subscriptionLimiter = new RateLimiterMemory({
      points: 3, // Number of requests
      duration: 300, // Per 5 minutes
      blockDuration: 300 // Block for 5 minutes
    });

    // Rate limiter for admin commands
    this.adminLimiter = new RateLimiterMemory({
      points: 20, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 30 // Block for 30 seconds
    });

    // Rate limiter for email submission
    this.emailLimiter = new RateLimiterMemory({
      points: 2, // Number of email submissions
      duration: 3600, // Per hour
      blockDuration: 3600 // Block for 1 hour
    });
  }

  /**
   * General rate limiting middleware
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async general(ctx, next) {
    const userId = ctx.from.id.toString();
    
    try {
      await this.generalLimiter.consume(userId);
      return next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      await ctx.reply(
        `⏰ You're sending commands too quickly! Please wait ${secs} seconds before trying again.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  /**
   * Subscription action rate limiting
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async subscription(ctx, next) {
    const userId = ctx.from.id.toString();
    
    try {
      await this.subscriptionLimiter.consume(userId);
      return next();
    } catch (rejRes) {
      const mins = Math.round(rejRes.msBeforeNext / 60000) || 1;
      await ctx.reply(
        `⏰ Too many subscription requests! Please wait ${mins} minutes before trying again.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  /**
   * Admin command rate limiting
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async admin(ctx, next) {
    const userId = ctx.from.id.toString();
    
    try {
      await this.adminLimiter.consume(userId);
      return next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      await ctx.reply(
        `⏰ Admin commands rate limited! Please wait ${secs} seconds.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  /**
   * Email submission rate limiting
   * @param {object} ctx - Telegraf context
   * @param {function} next - Next middleware function
   */
  async email(ctx, next) {
    const userId = ctx.from.id.toString();
    
    try {
      await this.emailLimiter.consume(userId);
      return next();
    } catch (rejRes) {
      const mins = Math.round(rejRes.msBeforeNext / 60000) || 1;
      await ctx.reply(
        `⏰ You've submitted too many email addresses recently! Please wait ${mins} minutes before trying again.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  /**
   * Check remaining points for a user
   * @param {string} userId - User ID
   * @param {string} limiterType - Type of limiter to check
   * @returns {object} Remaining points and reset time
   */
  async getRemainingPoints(userId, limiterType = 'general') {
    const limiters = {
      general: this.generalLimiter,
      subscription: this.subscriptionLimiter,
      admin: this.adminLimiter,
      email: this.emailLimiter
    };

    const limiter = limiters[limiterType];
    if (!limiter) {
      throw new Error(`Unknown limiter type: ${limiterType}`);
    }

    try {
      const res = await limiter.get(userId);
      return {
        remainingPoints: res ? limiter.points - res.hitCount : limiter.points,
        msBeforeNext: res ? res.msBeforeNext : 0,
        hitCount: res ? res.hitCount : 0
      };
    } catch (error) {
      return {
        remainingPoints: 0,
        msBeforeNext: error.msBeforeNext || 0,
        hitCount: limiter.points
      };
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   * @param {string} userId - User ID to reset
   * @param {string} limiterType - Type of limiter to reset
   */
  async resetUserLimit(userId, limiterType = 'general') {
    const limiters = {
      general: this.generalLimiter,
      subscription: this.subscriptionLimiter,
      admin: this.adminLimiter,
      email: this.emailLimiter
    };

    const limiter = limiters[limiterType];
    if (!limiter) {
      throw new Error(`Unknown limiter type: ${limiterType}`);
    }

    await limiter.delete(userId);
  }

  /**
   * Get rate limit status for all limiters
   * @param {string} userId - User ID
   * @returns {object} Status for all rate limiters
   */
  async getAllLimitStatus(userId) {
    const status = {};
    const limiterTypes = ['general', 'subscription', 'admin', 'email'];

    for (const type of limiterTypes) {
      try {
        status[type] = await this.getRemainingPoints(userId, type);
      } catch (error) {
        status[type] = { error: error.message };
      }
    }

    return status;
  }
}

module.exports = new RateLimitMiddleware();

