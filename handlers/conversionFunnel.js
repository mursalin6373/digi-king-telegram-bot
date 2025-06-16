const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const discountGenerator = require('../utils/discountGenerator');

class ConversionFunnelHandler {
  constructor() {
    this.funnelStages = {
      awareness: 'awareness',
      interest: 'interest',
      consideration: 'consideration',
      purchase: 'purchase',
      retention: 'retention',
      advocacy: 'advocacy'
    };
    
    this.exitIntentTriggers = new Set();
    this.setupFunnelTracking();
  }
  
  /**
   * Setup funnel tracking and optimization
   */
  setupFunnelTracking() {
    // Initialize tracking systems
    console.log('🎯 Conversion funnel optimization system initialized');
  }
  
  /**
   * Track user funnel progression
   * @param {string} userId - User's Telegram ID
   * @param {string} stage - Funnel stage
   * @param {object} data - Additional tracking data
   */
  async trackFunnelStage(userId, stage, data = {}) {
    try {
      await Analytics.create({
        type: 'funnel_progression',
        userId,
        data: {
          stage,
          timestamp: new Date(),
          source: data.source || 'telegram',
          ...data
        }
      });
      
      console.log(`📊 Funnel tracking: ${userId} -> ${stage}`);
      
    } catch (error) {
      console.error('Error tracking funnel stage:', error);
    }
  }
  
  /**
   * Generate exit-intent popup content
   * @param {object} user - User object
   * @param {string} page - Current page
   * @returns {object} Exit-intent popup configuration
   */
  generateExitIntentPopup(user, page = 'homepage') {
    const popups = {
      homepage: {
        title: "Wait! Don't Leave Empty-Handed! 🛑",
        message: "Get instant access to our Digital Marketing Starter Kit - FREE!",
        offer: {
          type: 'lead_magnet',
          title: 'Free Starter Kit',
          description: 'Email templates, social media calendar, and growth checklist',
          cta: 'Get My Free Kit'
        },
        urgency: "This offer expires in 24 hours!"
      },
      
      shop: {
        title: "Before You Go... Save 15%! 💰",
        message: "Don't miss out on these exclusive digital marketing tools!",
        offer: {
          type: 'discount',
          percentage: 15,
          code: this.generateExitIntentDiscount(user),
          cta: 'Claim My Discount'
        },
        urgency: "Limited time offer - expires in 30 minutes!"
      },
      
      product: {
        title: "Still Deciding? Here's 10% Off! 🤔",
        message: "This product could transform your marketing game!",
        offer: {
          type: 'discount',
          percentage: 10,
          code: this.generateExitIntentDiscount(user, 10),
          cta: 'Get Discount & Buy Now'
        },
        socialProof: "Join 10,000+ satisfied customers",
        urgency: "Only valid for the next 20 minutes!"
      },
      
      cart: {
        title: "Your Cart Is Waiting! 🛒",
        message: "Complete your purchase and start growing your business today!",
        offer: {
          type: 'free_shipping',
          title: 'Free Bonus Pack',
          description: 'Get our Premium Template Bundle FREE with your order',
          cta: 'Complete Purchase'
        },
        guarantee: "30-day money-back guarantee"
      }
    };
    
    return popups[page] || popups.homepage;
  }
  
  /**
   * Generate exit-intent discount code
   * @param {object} user - User object
   * @param {number} percentage - Discount percentage
   * @returns {string} Discount code
   */
  generateExitIntentDiscount(user, percentage = 15) {
    const segments = user?.segments || ['exit_intent'];
    const discount = discountGenerator.generateDiscountCode({
      percentage,
      expiryDays: 1, // Short expiry for urgency
      segments,
      campaignId: 'exit_intent'
    });
    
    return discount.code;
  }
  
  /**
   * Generate upsell recommendations
   * @param {object} user - User object
   * @param {string} currentProduct - Current product being viewed
   * @returns {object} Upsell configuration
   */
  generateUpsellOffer(user, currentProduct) {
    const upsellStrategies = {
      'digital-marketing-course': {
        title: "🚀 Supercharge Your Learning!",
        products: [
          {
            name: "Advanced Marketing Masterclass",
            description: "Take your skills to the next level",
            price: 197,
            discount: 30,
            badge: "Most Popular"
          },
          {
            name: "Marketing Tools Bundle",
            description: "Templates, checklists, and automation tools",
            price: 97,
            discount: 25,
            badge: "Best Value"
          }
        ],
        urgency: "Limited time: Add these to your order and save 30%!",
        socialProof: "2,847 students upgraded to this bundle"
      },
      
      'email-templates': {
        title: "📧 Complete Your Email Arsenal!",
        products: [
          {
            name: "Email Automation Course",
            description: "Learn to set up automated sequences",
            price: 127,
            discount: 25
          },
          {
            name: "Advanced Email Templates",
            description: "50+ high-converting templates",
            price: 67,
            discount: 20
          }
        ],
        bundle: {
          title: "Email Marketing Master Bundle",
          originalPrice: 194,
          bundlePrice: 97,
          savings: 97
        }
      }
    };
    
    return upsellStrategies[currentProduct] || this.getDefaultUpsell(user);
  }
  
  /**
   * Get default upsell for users
   * @param {object} user - User object
   * @returns {object} Default upsell configuration
   */
  getDefaultUpsell(user) {
    const segment = user?.segments?.[0] || 'new_customer';
    
    const defaultUpsells = {
      new_customer: {
        title: "🌟 Perfect for Beginners!",
        products: [
          {
            name: "Digital Marketing Fundamentals",
            description: "Everything you need to get started",
            price: 97,
            discount: 20
          }
        ]
      },
      
      returning_customer: {
        title: "🎯 Level Up Your Skills!",
        products: [
          {
            name: "Advanced Strategy Course",
            description: "Next-level marketing techniques",
            price: 197,
            discount: 25
          }
        ]
      },
      
      vip: {
        title: "💎 Exclusive VIP Collection!",
        products: [
          {
            name: "Master Class Bundle",
            description: "All our premium courses + bonuses",
            price: 497,
            discount: 40,
            badge: "VIP Exclusive"
          }
        ]
      }
    };
    
    return defaultUpsells[segment] || defaultUpsells.new_customer;
  }
  
  /**
   * Generate trust badges configuration
   * @returns {object} Trust badges configuration
   */
  getTrustBadges() {
    return {
      security: [
        {
          type: 'ssl',
          title: '256-bit SSL Encryption',
          icon: '🔒',
          description: 'Your data is secure'
        },
        {
          type: 'payment',
          title: 'Secure Payment',
          icon: '💳',
          description: 'Protected by Stripe'
        }
      ],
      
      guarantee: [
        {
          type: 'money_back',
          title: '30-Day Money-Back Guarantee',
          icon: '💰',
          description: 'Risk-free purchase'
        },
        {
          type: 'satisfaction',
          title: '100% Satisfaction Guaranteed',
          icon: '✅',
          description: 'Love it or get your money back'
        }
      ],
      
      social: [
        {
          type: 'customers',
          title: '10,000+ Happy Customers',
          icon: '👥',
          description: 'Join our growing community'
        },
        {
          type: 'rating',
          title: '4.9/5 Star Rating',
          icon: '⭐',
          description: 'Based on 2,500+ reviews'
        }
      ],
      
      delivery: [
        {
          type: 'instant',
          title: 'Instant Download',
          icon: '⚡',
          description: 'Access immediately after purchase'
        },
        {
          type: 'support',
          title: '24/7 Customer Support',
          icon: '🆘',
          description: 'We\'re here to help'
        }
      ]
    };
  }
  
  /**
   * Generate A/B test variations for CTAs
   * @param {string} page - Page type
   * @param {object} user - User object
   * @returns {object} CTA variations
   */
  getABTestCTAs(page, user) {
    const ctaTests = {
      homepage: {
        control: {
          text: "Get Started Today",
          color: "blue",
          size: "large"
        },
        variant_a: {
          text: "Start My Marketing Journey",
          color: "green",
          size: "large"
        },
        variant_b: {
          text: "Download Free Guide Now",
          color: "orange",
          size: "large"
        }
      },
      
      product: {
        control: {
          text: "Buy Now",
          color: "blue",
          urgency: false
        },
        variant_a: {
          text: "Get Instant Access",
          color: "green",
          urgency: false
        },
        variant_b: {
          text: "Claim Your Copy - Limited Time!",
          color: "red",
          urgency: true
        }
      },
      
      cart: {
        control: {
          text: "Complete Purchase",
          color: "blue"
        },
        variant_a: {
          text: "Secure My Order",
          color: "green"
        },
        variant_b: {
          text: "Yes, I Want This!",
          color: "orange"
        }
      }
    };
    
    // Assign user to test group based on user ID
    const testGroup = this.getTestGroup(user?.telegramId, page);
    return ctaTests[page]?.[testGroup] || ctaTests[page]?.control;
  }
  
  /**
   * Get test group for user
   * @param {string} userId - User ID
   * @param {string} testName - Test name
   * @returns {string} Test group
   */
  getTestGroup(userId, testName) {
    if (!userId) return 'control';
    
    // Simple hash-based assignment
    const hash = this.simpleHash(userId + testName);
    const groups = ['control', 'variant_a', 'variant_b'];
    return groups[hash % groups.length];
  }
  
  /**
   * Simple hash function
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Track A/B test conversion
   * @param {string} userId - User ID
   * @param {string} testName - Test name
   * @param {string} variant - Test variant
   * @param {string} action - Action taken
   */
  async trackABTest(userId, testName, variant, action) {
    try {
      await Analytics.create({
        type: 'ab_test',
        userId,
        data: {
          testName,
          variant,
          action,
          timestamp: new Date()
        }
      });
      
      console.log(`🧪 A/B Test: ${testName} - ${variant} - ${action}`);
      
    } catch (error) {
      console.error('Error tracking A/B test:', error);
    }
  }
  
  /**
   * Generate UTM tracking parameters
   * @param {object} params - UTM parameters
   * @returns {string} UTM query string
   */
  generateUTMParams(params) {
    const {
      source = 'telegram',
      medium = 'bot',
      campaign = 'general',
      term = '',
      content = ''
    } = params;
    
    const utmParams = new URLSearchParams({
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign
    });
    
    if (term) utmParams.append('utm_term', term);
    if (content) utmParams.append('utm_content', content);
    
    return utmParams.toString();
  }
  
  /**
   * Track UTM campaign performance
   * @param {string} userId - User ID
   * @param {object} utmParams - UTM parameters
   * @param {string} action - Action taken
   */
  async trackUTMCampaign(userId, utmParams, action) {
    try {
      await Analytics.create({
        type: 'utm_tracking',
        userId,
        data: {
          ...utmParams,
          action,
          timestamp: new Date()
        }
      });
      
      console.log(`📈 UTM Tracking: ${utmParams.utm_campaign} - ${action}`);
      
    } catch (error) {
      console.error('Error tracking UTM campaign:', error);
    }
  }
  
  /**
   * Generate personalized recommendations
   * @param {object} user - User object
   * @returns {object} Recommendations configuration
   */
  getPersonalizedRecommendations(user) {
    const segments = user?.segments || ['new_customer'];
    const totalSpent = user?.totalSpent || 0;
    const lastPurchase = user?.lastPurchaseDate;
    
    let recommendations = {
      title: "Recommended For You",
      subtitle: "Based on your interests and activity",
      products: []
    };
    
    // Segment-based recommendations
    if (segments.includes('new_customer')) {
      recommendations.products = [
        {
          name: "Digital Marketing Fundamentals",
          description: "Perfect starter course for beginners",
          price: 97,
          rating: 4.8,
          students: 5420,
          badge: "Beginner Friendly",
          discount: 20
        },
        {
          name: "Social Media Starter Kit",
          description: "Templates and strategies to grow your presence",
          price: 47,
          rating: 4.9,
          students: 3210,
          badge: "Quick Start"
        }
      ];
    }
    
    if (segments.includes('returning_customer')) {
      recommendations.products = [
        {
          name: "Advanced Marketing Strategies",
          description: "Next-level techniques for experienced marketers",
          price: 197,
          rating: 4.9,
          students: 2180,
          badge: "Advanced",
          discount: 15
        },
        {
          name: "Conversion Optimization Masterclass",
          description: "Double your conversion rates with proven methods",
          price: 147,
          rating: 4.8,
          students: 1540
        }
      ];
    }
    
    if (segments.includes('vip')) {
      recommendations.title = "VIP Exclusive Collection";
      recommendations.products = [
        {
          name: "Marketing Automation Suite",
          description: "Complete automation system + personal coaching",
          price: 497,
          rating: 5.0,
          students: 420,
          badge: "VIP Only",
          discount: 30
        },
        {
          name: "Master Class Bundle",
          description: "All courses + exclusive bonuses and support",
          price: 797,
          originalPrice: 1200,
          rating: 4.9,
          students: 680,
          badge: "Complete Package"
        }
      ];
    }
    
    // Add urgency for inactive users
    if (segments.includes('inactive')) {
      recommendations.subtitle = "Welcome back! Special pricing just for you";
      recommendations.urgency = "Limited time: 48 hours only!";
      recommendations.products.forEach(product => {
        product.discount = (product.discount || 0) + 10; // Extra 10% for inactive users
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate scarcity and urgency elements
   * @param {string} productType - Type of product
   * @returns {object} Scarcity configuration
   */
  getScarcityElements(productType = 'course') {
    const scarcityTypes = {
      course: {
        stock: {
          message: "Only 23 spots left in this cohort!",
          type: "limited_spots",
          count: 23
        },
        time: {
          message: "Early bird pricing ends in:",
          type: "countdown",
          endTime: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
        },
        social: {
          message: "147 people are viewing this course right now",
          type: "live_viewers",
          count: 147
        }
      },
      
      template: {
        stock: {
          message: "Download limit: 500 remaining",
          type: "download_limit",
          count: 500
        },
        time: {
          message: "Flash sale ends at midnight!",
          type: "flash_sale",
          endTime: new Date().setHours(23, 59, 59, 999)
        }
      },
      
      bundle: {
        stock: {
          message: "Bundle offer limited to first 100 customers",
          type: "first_customers",
          count: 100
        },
        time: {
          message: "Bonus expires in 24 hours:",
          type: "bonus_expiry",
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }
    };
    
    return scarcityTypes[productType] || scarcityTypes.course;
  }
  
  /**
   * Get conversion funnel analytics
   * @param {string} timeframe - Timeframe for analytics (7d, 30d, 90d)
   * @returns {object} Funnel analytics
   */
  async getFunnelAnalytics(timeframe = '30d') {
    try {
      const days = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      }[timeframe] || 30;
      
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      
      const funnelData = await Analytics.aggregate([
        {
          $match: {
            type: 'funnel_progression',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$data.stage',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        },
        {
          $project: {
            stage: '$_id',
            totalEvents: '$count',
            uniqueUsers: '$uniqueUserCount'
          }
        }
      ]);
      
      // Calculate conversion rates
      const stages = ['awareness', 'interest', 'consideration', 'purchase'];
      const conversions = {};
      
      for (let i = 0; i < stages.length - 1; i++) {
        const current = funnelData.find(d => d.stage === stages[i]);
        const next = funnelData.find(d => d.stage === stages[i + 1]);
        
        if (current && next) {
          conversions[`${stages[i]}_to_${stages[i + 1]}`] = {
            rate: (next.uniqueUsers / current.uniqueUsers * 100).toFixed(2),
            from: current.uniqueUsers,
            to: next.uniqueUsers
          };
        }
      }
      
      return {
        timeframe,
        stages: funnelData,
        conversions,
        totalUsers: Math.max(...funnelData.map(d => d.uniqueUsers)),
        overallConversion: funnelData.find(d => d.stage === 'purchase')?.uniqueUsers || 0
      };
      
    } catch (error) {
      console.error('Error getting funnel analytics:', error);
      return null;
    }
  }
  
  /**
   * Get A/B test results
   * @param {string} testName - Test name
   * @returns {object} A/B test results
   */
  async getABTestResults(testName) {
    try {
      const results = await Analytics.aggregate([
        {
          $match: {
            type: 'ab_test',
            'data.testName': testName
          }
        },
        {
          $group: {
            _id: {
              variant: '$data.variant',
              action: '$data.action'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.variant',
            actions: {
              $push: {
                action: '$_id.action',
                count: '$count'
              }
            },
            totalEvents: { $sum: '$count' }
          }
        }
      ]);
      
      return {
        testName,
        variants: results,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      return null;
    }
  }
}

module.exports = new ConversionFunnelHandler();

