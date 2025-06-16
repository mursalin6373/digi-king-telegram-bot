const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Analytics = require('../models/Analytics');
const discountGenerator = require('../utils/discountGenerator');
const nodeCron = require('node-cron');

class EmailAutomationHandler {
  constructor() {
    this.emailTemplates = {
      welcome: this.getWelcomeTemplate(),
      abandonedCart: this.getAbandonedCartTemplate(),
      postPurchase: this.getPostPurchaseTemplate(),
      promotional: this.getPromotionalTemplate(),
      winback: this.getWinbackTemplate()
    };
    
    this.setupAutomatedTasks();
  }
  
  /**
   * Setup automated email tasks
   */
  setupAutomatedTasks() {
    // Send abandoned cart emails daily at 10 AM
    nodeCron.schedule('0 10 * * *', () => {
      this.sendAbandonedCartEmails();
    });
    
    // Send win-back emails weekly on Mondays at 9 AM
    nodeCron.schedule('0 9 * * 1', () => {
      this.sendWinbackEmails();
    });
    
    // Send weekly promotional emails on Fridays at 2 PM
    nodeCron.schedule('0 14 * * 5', () => {
      this.sendWeeklyPromotional();
    });
  }
  
  /**
   * Send welcome email sequence
   * @param {string} userId - User's Telegram ID
   */
  async sendWelcomeSequence(userId) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user || !user.isSubscribed) return;
      
      // Immediate welcome email
      await this.sendWelcomeEmail(user);
      
      // Schedule follow-up emails
      setTimeout(() => this.sendWelcomeDay2(user), 2 * 24 * 60 * 60 * 1000); // 2 days
      setTimeout(() => this.sendWelcomeDay7(user), 7 * 24 * 60 * 60 * 1000); // 7 days
      
    } catch (error) {
      console.error('Error sending welcome sequence:', error);
    }
  }
  
  /**
   * Send immediate welcome email
   * @param {object} user - User object
   */
  async sendWelcomeEmail(user) {
    try {
      // Generate welcome discount
      const discountCode = discountGenerator.generateDiscountCode({
        percentage: 15,
        expiryDays: 14,
        segments: ['new_customer']
      });
      
      const template = this.emailTemplates.welcome;
      const personalizedContent = template
        .replace('{{firstName}}', user.firstName || 'Valued Customer')
        .replace('{{discountCode}}', discountCode.code)
        .replace('{{discountPercentage}}', discountCode.percentage)
        .replace('{{expiryDate}}', discountCode.expiryDate.toLocaleDateString());
      
      // Create campaign for tracking
      const campaign = await this.createEmailCampaign({
        name: `Welcome Email - ${user.telegramId}`,
        type: 'welcome',
        targetSegments: ['new_customer'],
        content: personalizedContent,
        discountCode
      });
      
      // Send email (placeholder - would integrate with actual email service)
      await this.sendEmail(user.email, 'Welcome to Digi-King! 🎉', personalizedContent, campaign.campaignId);
      
      console.log(`📧 Welcome email sent to ${user.email}`);
      
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }
  
  /**
   * Send day 2 follow-up email
   * @param {object} user - User object
   */
  async sendWelcomeDay2(user) {
    try {
      const template = `
        <h2>How are you enjoying Digi-King, {{firstName}}?</h2>
        
        <p>We wanted to check in and see how you're finding our products so far!</p>
        
        <div class="featured-products">
          <h3>🔥 Trending This Week:</h3>
          <ul>
            <li>Premium Digital Marketing Course - 40% OFF</li>
            <li>Social Media Growth Kit - Best Seller</li>
            <li>Email Marketing Templates - New Release</li>
          </ul>
        </div>
        
        <p>Don't forget, you still have your welcome discount available:</p>
        <div class="discount-box">
          <strong>Code: {{discountCode}} - {{discountPercentage}}% OFF</strong><br>
          <em>Expires: {{expiryDate}}</em>
        </div>
        
        <div class="cta-section">
          <a href="https://digi-king.com/shop?utm_source=email&utm_medium=day2&utm_campaign=welcome" class="cta-button">Shop Now</a>
        </div>
        
        <p>Questions? Just reply to this email - we're here to help!</p>
      `;
      
      const personalizedContent = template
        .replace('{{firstName}}', user.firstName || 'there');
      
      await this.sendEmail(user.email, 'Discover what\'s trending at Digi-King 📈', personalizedContent);
      
    } catch (error) {
      console.error('Error sending day 2 email:', error);
    }
  }
  
  /**
   * Send day 7 follow-up email
   * @param {object} user - User object
   */
  async sendWelcomeDay7(user) {
    try {
      const template = `
        <h2>Your journey with Digi-King continues, {{firstName}}!</h2>
        
        <p>It's been a week since you joined our community. Here's what you might have missed:</p>
        
        <div class="community-highlights">
          <h3>🌟 Community Highlights:</h3>
          <ul>
            <li>Over 10,000 satisfied customers</li>
            <li>4.9/5 average product rating</li>
            <li>24/7 customer support</li>
            <li>30-day money-back guarantee</li>
          </ul>
        </div>
        
        <div class="exclusive-offer">
          <h3>🎁 Exclusive Week 1 Bonus:</h3>
          <p>Get our "Digital Success Starter Pack" FREE with any purchase this week!</p>
          <p><strong>Includes:</strong></p>
          <ul>
            <li>Social Media Calendar Template</li>
            <li>Email Marketing Checklist</li>
            <li>Content Creation Guide</li>
          </ul>
        </div>
        
        <div class="cta-section">
          <a href="https://digi-king.com/shop?utm_source=email&utm_medium=day7&utm_campaign=welcome" class="cta-button">Claim Your Bonus</a>
        </div>
        
        <div class="support-section">
          <p>Need help choosing the right product? Our team is standing by:</p>
          <p>📧 support@digi-king.com | 💬 Live Chat | 📞 1-800-DIGI-KING</p>
        </div>
      `;
      
      const personalizedContent = template
        .replace('{{firstName}}', user.firstName || 'there');
      
      await this.sendEmail(user.email, 'Your exclusive Week 1 bonus awaits! 🎁', personalizedContent);
      
    } catch (error) {
      console.error('Error sending day 7 email:', error);
    }
  }
  
  /**
   * Send abandoned cart emails
   */
  async sendAbandonedCartEmails() {
    try {
      // This would typically integrate with your e-commerce platform
      // For now, we'll simulate abandoned cart detection
      
      const usersWithAbandonedCarts = await this.detectAbandonedCarts();
      
      for (const user of usersWithAbandonedCarts) {
        await this.sendAbandonedCartEmail(user);
      }
      
      console.log(`📧 Sent ${usersWithAbandonedCarts.length} abandoned cart emails`);
      
    } catch (error) {
      console.error('Error sending abandoned cart emails:', error);
    }
  }
  
  /**
   * Send abandoned cart email to user
   * @param {object} user - User object with cart data
   */
  async sendAbandonedCartEmail(user) {
    try {
      // Generate recovery discount
      const discountCode = discountGenerator.generateDiscountCode({
        percentage: 10,
        expiryDays: 3,
        segments: user.segments
      });
      
      const template = this.emailTemplates.abandonedCart;
      const personalizedContent = template
        .replace('{{firstName}}', user.firstName || 'there')
        .replace('{{discountCode}}', discountCode.code)
        .replace('{{discountPercentage}}', discountCode.percentage)
        .replace('{{cartItems}}', this.generateCartItemsHtml(user.cartItems || []))
        .replace('{{cartTotal}}', user.cartTotal || '0.00');
      
      await this.sendEmail(user.email, 'Don\'t forget your items! Save 10% now 🛒', personalizedContent);
      
      // Track abandoned cart email
      await Analytics.create({
        type: 'email_sent',
        userId: user.telegramId,
        data: {
          emailType: 'abandoned_cart',
          discountCode: discountCode.code,
          cartValue: user.cartTotal
        }
      });
      
    } catch (error) {
      console.error('Error sending abandoned cart email:', error);
    }
  }
  
  /**
   * Send post-purchase follow-up emails
   * @param {string} userId - User's Telegram ID
   * @param {object} orderData - Order information
   */
  async sendPostPurchaseSequence(userId, orderData) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) return;
      
      // Immediate order confirmation
      await this.sendOrderConfirmation(user, orderData);
      
      // Schedule follow-up emails
      setTimeout(() => this.sendDeliveryUpdate(user, orderData), 24 * 60 * 60 * 1000); // 1 day
      setTimeout(() => this.sendReviewRequest(user, orderData), 7 * 24 * 60 * 60 * 1000); // 7 days
      setTimeout(() => this.sendRecommendations(user, orderData), 14 * 24 * 60 * 60 * 1000); // 14 days
      
    } catch (error) {
      console.error('Error sending post-purchase sequence:', error);
    }
  }
  
  /**
   * Send order confirmation email
   * @param {object} user - User object
   * @param {object} orderData - Order information
   */
  async sendOrderConfirmation(user, orderData) {
    try {
      const template = `
        <h2>Order Confirmed! Thank you, {{firstName}} 🎉</h2>
        
        <div class="order-summary">
          <h3>Order #{{orderId}}</h3>
          <p><strong>Order Date:</strong> {{orderDate}}</p>
          <p><strong>Total:</strong> ${{orderTotal}}</p>
          
          <h4>Items Ordered:</h4>
          {{orderItems}}
        </div>
        
        <div class="next-steps">
          <h3>What happens next?</h3>
          <ul>
            <li>📧 You'll receive download links within 5 minutes</li>
            <li>💾 Products will be available in your account</li>
            <li>📞 Our support team is here if you need help</li>
          </ul>
        </div>
        
        <div class="support-info">
          <p><strong>Need help?</strong></p>
          <p>📧 support@digi-king.com</p>
          <p>🌐 <a href="https://digi-king.com/account">Manage Your Account</a></p>
        </div>
      `;
      
      const personalizedContent = template
        .replace('{{firstName}}', user.firstName || 'Valued Customer')
        .replace('{{orderId}}', orderData.id)
        .replace('{{orderDate}}', new Date().toLocaleDateString())
        .replace('{{orderTotal}}', orderData.total.toFixed(2))
        .replace('{{orderItems}}', this.generateOrderItemsHtml(orderData.items));
      
      await this.sendEmail(user.email, `Order Confirmed #${orderData.id} - Digi-King`, personalizedContent);
      
    } catch (error) {
      console.error('Error sending order confirmation:', error);
    }
  }
  
  /**
   * Send win-back emails to inactive users
   */
  async sendWinbackEmails() {
    try {
      // Find users who haven't interacted in 30+ days
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const inactiveUsers = await User.find({
        isSubscribed: true,
        lastInteraction: { $lt: thirtyDaysAgo },
        segments: { $in: ['inactive'] }
      }).limit(100); // Batch process
      
      for (const user of inactiveUsers) {
        await this.sendWinbackEmail(user);
      }
      
      console.log(`📧 Sent ${inactiveUsers.length} win-back emails`);
      
    } catch (error) {
      console.error('Error sending win-back emails:', error);
    }
  }
  
  /**
   * Send win-back email to inactive user
   * @param {object} user - User object
   */
  async sendWinbackEmail(user) {
    try {
      // Generate special comeback discount
      const discountCode = discountGenerator.generateDiscountCode({
        percentage: 25,
        expiryDays: 7,
        segments: ['inactive']
      });
      
      const template = this.emailTemplates.winback;
      const personalizedContent = template
        .replace('{{firstName}}', user.firstName || 'there')
        .replace('{{discountCode}}', discountCode.code)
        .replace('{{discountPercentage}}', discountCode.percentage);
      
      await this.sendEmail(user.email, 'We miss you! Here\'s 25% off to welcome you back 💝', personalizedContent);
      
      // Track win-back email
      await Analytics.create({
        type: 'email_sent',
        userId: user.telegramId,
        data: {
          emailType: 'winback',
          discountCode: discountCode.code,
          daysSinceLastInteraction: Math.floor((Date.now() - user.lastInteraction) / (24 * 60 * 60 * 1000))
        }
      });
      
    } catch (error) {
      console.error('Error sending win-back email:', error);
    }
  }
  
  /**
   * Send weekly promotional email
   */
  async sendWeeklyPromotional() {
    try {
      // Get subscribers segmented by preferences
      const subscribers = await User.find({
        isSubscribed: true,
        'preferences.promotions': true
      });
      
      // Segment users for personalized promotions
      const newCustomers = subscribers.filter(u => u.segments.includes('new_customer'));
      const returningCustomers = subscribers.filter(u => u.segments.includes('returning_customer'));
      const vipCustomers = subscribers.filter(u => u.segments.includes('vip'));
      
      // Send targeted promotions to each segment
      await this.sendSegmentedPromotion(newCustomers, 'new_customer');
      await this.sendSegmentedPromotion(returningCustomers, 'returning_customer');
      await this.sendSegmentedPromotion(vipCustomers, 'vip');
      
      console.log(`📧 Sent weekly promotional emails to ${subscribers.length} subscribers`);
      
    } catch (error) {
      console.error('Error sending weekly promotional:', error);
    }
  }
  
  /**
   * Send segmented promotional email
   * @param {Array} users - Users in the segment
   * @param {string} segment - User segment
   */
  async sendSegmentedPromotion(users, segment) {
    try {
      const promotions = {
        new_customer: {
          subject: 'New to Digi-King? Start with these bestsellers! 🌟',
          discount: 20,
          products: ['Digital Marketing Fundamentals', 'Social Media Starter Kit']
        },
        returning_customer: {
          subject: 'Welcome back! Exclusive deals inside 🎯',
          discount: 15,
          products: ['Advanced Marketing Strategies', 'Email Automation Pro']
        },
        vip: {
          subject: 'VIP Early Access: New Premium Collection 💎',
          discount: 30,
          products: ['Master Class Bundle', 'Enterprise Marketing Suite']
        }
      };
      
      const promo = promotions[segment];
      if (!promo) return;
      
      for (const user of users) {
        const discountCode = discountGenerator.generateDiscountCode({
          percentage: promo.discount,
          expiryDays: 7,
          segments: [segment]
        });
        
        const template = this.emailTemplates.promotional;
        const personalizedContent = template
          .replace('{{firstName}}', user.firstName || 'Valued Customer')
          .replace('{{discountCode}}', discountCode.code)
          .replace('{{discountPercentage}}', discountCode.percentage)
          .replace('{{featuredProducts}}', this.generateFeaturedProductsHtml(promo.products));
        
        await this.sendEmail(user.email, promo.subject, personalizedContent);
        
        // Small delay to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error('Error sending segmented promotion:', error);
    }
  }
  
  /**
   * Create email campaign for tracking
   * @param {object} campaignData - Campaign data
   * @returns {object} Created campaign
   */
  async createEmailCampaign(campaignData) {
    try {
      const campaign = new Campaign({
        name: campaignData.name,
        description: `Automated email: ${campaignData.type}`,
        type: campaignData.type,
        targetSegments: campaignData.targetSegments,
        message: {
          text: campaignData.content,
          parseMode: 'HTML'
        },
        discountCode: campaignData.discountCode,
        status: 'active',
        createdBy: 'email_automation'
      });
      
      await campaign.save();
      return campaign;
      
    } catch (error) {
      console.error('Error creating email campaign:', error);
      throw error;
    }
  }
  
  /**
   * Send email (placeholder for actual email service integration)
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} content - Email content
   * @param {string} campaignId - Campaign ID for tracking
   */
  async sendEmail(to, subject, content, campaignId = null) {
    try {
      // This is a placeholder - in production, integrate with:
      // - SendGrid, Mailgun, AWS SES, etc.
      // - Add proper email templates with CSS styling
      // - Handle bounces, unsubscribes, and delivery tracking
      
      console.log(`📧 Sending email to ${to}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Campaign: ${campaignId}`);
      console.log('--- Email Content ---');
      console.log(content);
      console.log('--- End Email ---\n');
      
      // Track email sent
      if (campaignId) {
        await Analytics.create({
          type: 'email_sent',
          campaignId,
          data: {
            recipient: to,
            subject,
            timestamp: new Date()
          }
        });
      }
      
      return { success: true, messageId: `fake_${Date.now()}` };
      
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
  
  /**
   * Detect users with abandoned carts (placeholder)
   * @returns {Array} Users with abandoned carts
   */
  async detectAbandonedCarts() {
    // This would integrate with your e-commerce platform
    // For demonstration, we'll return a simulated result
    return [];
  }
  
  /**
   * Generate cart items HTML
   * @param {Array} items - Cart items
   * @returns {string} HTML for cart items
   */
  generateCartItemsHtml(items) {
    if (!items || items.length === 0) {
      return '<p>Your cart items</p>';
    }
    
    return items.map(item => 
      `<div class="cart-item">
         <h4>${item.name}</h4>
         <p>Quantity: ${item.quantity} | Price: $${item.price}</p>
       </div>`
    ).join('\n');
  }
  
  /**
   * Generate order items HTML
   * @param {Array} items - Order items
   * @returns {string} HTML for order items
   */
  generateOrderItemsHtml(items) {
    if (!items || items.length === 0) {
      return '<p>No items</p>';
    }
    
    return items.map(item => 
      `<div class="order-item">
         <h4>${item.name}</h4>
         <p>Quantity: ${item.quantity} | Price: $${item.price}</p>
       </div>`
    ).join('\n');
  }
  
  /**
   * Generate featured products HTML
   * @param {Array} products - Featured products
   * @returns {string} HTML for featured products
   */
  generateFeaturedProductsHtml(products) {
    return products.map(product => 
      `<div class="featured-product">
         <h4>${product}</h4>
         <a href="https://digi-king.com/products/${product.toLowerCase().replace(/\s+/g, '-')}">View Product</a>
       </div>`
    ).join('\n');
  }
  
  /**
   * Get welcome email template
   * @returns {string} Welcome email template
   */
  getWelcomeTemplate() {
    return `
      <h2>Welcome to Digi-King, {{firstName}}! 🎉</h2>
      
      <p>Thank you for joining our community of digital entrepreneurs and marketers!</p>
      
      <div class="welcome-offer">
        <h3>🎁 Your Welcome Gift:</h3>
        <div class="discount-box">
          <strong>{{discountCode}}</strong><br>
          {{discountPercentage}}% OFF your first order<br>
          <em>Valid until {{expiryDate}}</em>
        </div>
      </div>
      
      <div class="what-to-expect">
        <h3>What to expect from us:</h3>
        <ul>
          <li>📚 Exclusive digital products and courses</li>
          <li>🎯 Weekly marketing tips and strategies</li>
          <li>💰 Special discounts and early access to sales</li>
          <li>🤝 Supportive community and expert guidance</li>
        </ul>
      </div>
      
      <div class="cta-section">
        <a href="https://digi-king.com/shop?utm_source=email&utm_medium=welcome&utm_campaign=new_subscriber" class="cta-button">Start Shopping</a>
      </div>
      
      <p>Questions? Reply to this email - we're here to help!</p>
      
      <div class="social-links">
        <p>Follow us:</p>
        <a href="https://facebook.com/digiking">Facebook</a> |
        <a href="https://twitter.com/digiking">Twitter</a> |
        <a href="https://instagram.com/digiking">Instagram</a>
      </div>
    `;
  }
  
  /**
   * Get abandoned cart email template
   * @returns {string} Abandoned cart email template
   */
  getAbandonedCartTemplate() {
    return `
      <h2>Don't miss out, {{firstName}}! 🛒</h2>
      
      <p>You left some great items in your cart. Don't let them slip away!</p>
      
      <div class="cart-summary">
        <h3>Your Cart Items:</h3>
        {{cartItems}}
        <p><strong>Total: $\{\{cartTotal\}\}</strong></p>
      </div>
      
      <div class="special-offer">
        <h3>🎯 Special offer just for you:</h3>
        <div class="discount-box">
          <strong>{{discountCode}}</strong><br>
          Save {{discountPercentage}}% on your order<br>
          <em>Limited time - expires in 3 days!</em>
        </div>
      </div>
      
      <div class="urgency">
        <p>⏰ <strong>Hurry!</strong> These items are popular and may sell out soon.</p>
      </div>
      
      <div class="cta-section">
        <a href="https://digi-king.com/cart?utm_source=email&utm_medium=cart_recovery" class="cta-button">Complete Your Purchase</a>
      </div>
      
      <div class="guarantees">
        <h4>Shop with confidence:</h4>
        <ul>
          <li>✅ 30-day money-back guarantee</li>
          <li>🔒 Secure checkout</li>
          <li>⚡ Instant download</li>
          <li>🆘 24/7 customer support</li>
        </ul>
      </div>
    `;
  }
  
  /**
   * Get post-purchase email template
   * @returns {string} Post-purchase email template
   */
  getPostPurchaseTemplate() {
    return `
      <h2>Thank you for your purchase, {{firstName}}! 🙏</h2>
      
      <p>We're thrilled that you chose Digi-King for your digital marketing needs.</p>
      
      <div class="order-summary">
        <h3>Order Summary:</h3>
        {{orderItems}}
      </div>
      
      <div class="next-steps">
        <h3>What's next?</h3>
        <ul>
          <li>📥 Check your email for download links</li>
          <li>💾 Access your purchases in your account</li>
          <li>📖 Don't forget to check out our implementation guides</li>
        </ul>
      </div>
      
      <div class="support">
        <h3>Need help getting started?</h3>
        <p>Our team is here to ensure you get the most out of your purchase:</p>
        <ul>
          <li>📧 Email: support@digi-king.com</li>
          <li>💬 Live chat on our website</li>
          <li>📚 Access our knowledge base</li>
        </ul>
      </div>
      
      <div class="community">
        <h3>Join our community!</h3>
        <p>Connect with other entrepreneurs and get exclusive tips:</p>
        <a href="https://facebook.com/groups/digiking-community">Join Facebook Group</a>
      </div>
    `;
  }
  
  /**
   * Get promotional email template
   * @returns {string} Promotional email template
   */
  getPromotionalTemplate() {
    return `
      <h2>Exclusive deals for you, {{firstName}}! 🎯</h2>
      
      <p>We've handpicked these special offers just for our valued subscribers.</p>
      
      <div class="exclusive-offer">
        <h3>🔥 Limited Time Offer:</h3>
        <div class="discount-box">
          <strong>{{discountCode}}</strong><br>
          {{discountPercentage}}% OFF Everything<br>
          <em>Valid for the next 7 days only!</em>
        </div>
      </div>
      
      <div class="featured-products">
        <h3>🌟 Featured This Week:</h3>
        {{featuredProducts}}
      </div>
      
      <div class="social-proof">
        <h3>What our customers are saying:</h3>
        <blockquote>
          "These digital marketing tools completely transformed my business. Highly recommended!"
          <cite>- Sarah M., Entrepreneur</cite>
        </blockquote>
      </div>
      
      <div class="cta-section">
        <a href="https://digi-king.com/shop?utm_source=email&utm_medium=promotional" class="cta-button">Shop Now & Save</a>
      </div>
      
      <div class="urgency">
        <p>⚡ <strong>Don't wait!</strong> This offer expires in 7 days and won't be repeated.</p>
      </div>
    `;
  }
  
  /**
   * Get win-back email template
   * @returns {string} Win-back email template
   */
  getWinbackTemplate() {
    return `
      <h2>We miss you, {{firstName}}! 💔</h2>
      
      <p>It's been a while since we've seen you at Digi-King. We want to welcome you back with something special!</p>
      
      <div class="comeback-offer">
        <h3>🎁 Welcome Back Gift:</h3>
        <div class="discount-box">
          <strong>{{discountCode}}</strong><br>
          {{discountPercentage}}% OFF your next order<br>
          <em>Our biggest discount ever - just for you!</em>
        </div>
      </div>
      
      <div class="whats-new">
        <h3>🆕 What you've missed:</h3>
        <ul>
          <li>New AI-powered marketing tools</li>
          <li>Updated social media strategies for 2024</li>
          <li>Exclusive video tutorials</li>
          <li>Enhanced customer support</li>
        </ul>
      </div>
      
      <div class="personal-touch">
        <p>We've grown a lot since you were last here, but our commitment to helping you succeed hasn't changed.</p>
        <p>Your success is our success, and we're here to support your journey.</p>
      </div>
      
      <div class="cta-section">
        <a href="https://digi-king.com/shop?utm_source=email&utm_medium=winback" class="cta-button">Welcome Me Back</a>
      </div>
      
      <div class="no-pressure">
        <p><em>Not ready to purchase? No problem! Just reply and let us know how we can better serve you.</em></p>
      </div>
    `;
  }
}

module.exports = new EmailAutomationHandler();

