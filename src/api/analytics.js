const express = require('express');
const User = require('../../models/User');
const Affiliate = require('../../models/Affiliate');
const Referral = require('../../models/Referral');
const Analytics = require('../../models/Analytics');
const Campaign = require('../../models/Campaign');

const router = express.Router();

// Middleware for admin authentication
const requireAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Track analytics event
router.post('/track', async (req, res) => {
  try {
    const { user_id, event_type, event_data = {} } = req.body;
    
    const analytics = new Analytics({
      user_id,
      event_type,
      event_data,
      timestamp: new Date()
    });
    
    await analytics.save();
    res.json({ success: true, analytics_id: analytics._id });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to track analytics' });
  }
});

// Get comprehensive KPI dashboard data
router.get('/kpis', requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const periodDays = parseInt(period.replace('d', ''));
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    // Subscriber Growth Metrics
    const totalSubscribers = await User.countDocuments({ subscription_status: 'active' });
    const newSubscribers = await User.countDocuments({ 
      subscription_status: 'active',
      created_at: { $gte: startDate }
    });
    
    const previousPeriodStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousNewSubscribers = await User.countDocuments({
      subscription_status: 'active',
      created_at: { $gte: previousPeriodStart, $lt: startDate }
    });
    
    const subscriberGrowthRate = previousNewSubscribers > 0 
      ? ((newSubscribers - previousNewSubscribers) / previousNewSubscribers * 100).toFixed(2)
      : 100;
    
    // Email Campaign Metrics
    const campaigns = await Campaign.find({ 
      created_at: { $gte: startDate },
      status: 'sent'
    });
    
    const emailMetrics = campaigns.reduce((acc, campaign) => {
      acc.totalSent += campaign.sent_count || 0;
      acc.totalOpened += campaign.opened_count || 0;
      acc.totalClicked += campaign.clicked_count || 0;
      acc.totalConverted += campaign.converted_count || 0;
      return acc;
    }, { totalSent: 0, totalOpened: 0, totalClicked: 0, totalConverted: 0 });
    
    const openRate = emailMetrics.totalSent > 0 
      ? (emailMetrics.totalOpened / emailMetrics.totalSent * 100).toFixed(2)
      : 0;
    const clickRate = emailMetrics.totalSent > 0 
      ? (emailMetrics.totalClicked / emailMetrics.totalSent * 100).toFixed(2)
      : 0;
    const conversionRate = emailMetrics.totalSent > 0 
      ? (emailMetrics.totalConverted / emailMetrics.totalSent * 100).toFixed(2)
      : 0;
    
    // Affiliate System Metrics
    const totalAffiliates = await Affiliate.countDocuments({ status: 'active' });
    const affiliateStats = await Affiliate.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total_sales' },
          totalCommission: { $sum: '$total_commission' },
          avgCommissionRate: { $avg: '$commission_rate' }
        }
      }
    ]);
    
    const affiliateMetrics = affiliateStats[0] || {
      totalSales: 0,
      totalCommission: 0,
      avgCommissionRate: 0
    };
    
    // Referral System Metrics
    const totalReferrals = await Referral.countDocuments({ status: 'completed' });
    const referralStats = await Referral.aggregate([
      { $match: { created_at: { $gte: startDate }, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRewards: { $sum: '$reward_amount' },
          avgRewardAmount: { $avg: '$reward_amount' }
        }
      }
    ]);
    
    const referralMetrics = referralStats[0] || {
      totalRewards: 0,
      avgRewardAmount: 0
    };
    
    // Conversion Funnel Analytics
    const funnelEvents = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$event_type', count: { $sum: 1 } } }
    ]);
    
    const funnelData = {};
    funnelEvents.forEach(event => {
      funnelData[event._id] = event.count;
    });
    
    // Sales Analytics
    const salesAnalytics = await Analytics.aggregate([
      {
        $match: {
          event_type: 'purchase',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$event_data.order_amount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$event_data.order_amount' }
        }
      }
    ]);
    
    const salesMetrics = salesAnalytics[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0
    };
    
    // GDPR Compliance Metrics
    const gdprMetrics = {
      totalUsers: await User.countDocuments(),
      consentedUsers: await User.countDocuments({ gdpr_consent: true }),
      optedOutUsers: await User.countDocuments({ gdpr_consent: false }),
      emailOptIns: await User.countDocuments({ email_notifications: true })
    };
    
    gdprMetrics.consentRate = gdprMetrics.totalUsers > 0 
      ? (gdprMetrics.consentedUsers / gdprMetrics.totalUsers * 100).toFixed(2)
      : 0;
    
    // Placeholder for discount metrics
    const discountMetrics = {
      totalCodes: 0,
      totalUsage: 0,
      activeCodes: 0
    };
    
    const response = {
      period: `${periodDays} days`,
      generated_at: new Date().toISOString(),
      subscriber_metrics: {
        total_subscribers: totalSubscribers,
        new_subscribers: newSubscribers,
        growth_rate: `${subscriberGrowthRate}%`
      },
      email_metrics: {
        campaigns_sent: campaigns.length,
        total_emails_sent: emailMetrics.totalSent,
        open_rate: `${openRate}%`,
        click_rate: `${clickRate}%`,
        conversion_rate: `${conversionRate}%`
      },
      affiliate_metrics: {
        total_affiliates: totalAffiliates,
        total_sales: affiliateMetrics.totalSales,
        total_commission: affiliateMetrics.totalCommission,
        avg_commission_rate: `${(affiliateMetrics.avgCommissionRate || 0).toFixed(2)}%`
      },
      referral_metrics: {
        total_referrals: totalReferrals,
        total_rewards: referralMetrics.totalRewards,
        avg_reward: referralMetrics.avgRewardAmount
      },
      sales_metrics: {
        total_revenue: salesMetrics.totalRevenue,
        total_orders: salesMetrics.totalOrders,
        avg_order_value: salesMetrics.avgOrderValue
      },
      conversion_funnel: funnelData,
      gdpr_compliance: gdprMetrics,
      discount_metrics: discountMetrics
    };
    
    res.json(response);
  } catch (error) {
    console.error('KPI calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate KPIs' });
  }
});

// Get subscriber growth over time
router.get('/subscriber-growth', requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const periodDays = parseInt(period.replace('d', ''));
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    const growthData = await User.aggregate([
      {
        $match: {
          created_at: { $gte: startDate },
          subscription_status: 'active'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json(growthData);
  } catch (error) {
    console.error('Subscriber growth calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate subscriber growth' });
  }
});

// Get conversion funnel data
router.get('/conversion-funnel', requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const periodDays = parseInt(period.replace('d', ''));
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    const funnelSteps = [
      'bot_start',
      'email_subscribe', 
      'affiliate_view',
      'product_view',
      'purchase'
    ];
    
    const funnelData = {};
    
    for (const step of funnelSteps) {
      const count = await Analytics.countDocuments({
        event_type: step,
        timestamp: { $gte: startDate }
      });
      funnelData[step] = count;
    }
    
    // Calculate conversion rates between steps
    const conversionRates = {};
    for (let i = 1; i < funnelSteps.length; i++) {
      const currentStep = funnelSteps[i];
      const previousStep = funnelSteps[i - 1];
      
      if (funnelData[previousStep] > 0) {
        conversionRates[`${previousStep}_to_${currentStep}`] = 
          (funnelData[currentStep] / funnelData[previousStep] * 100).toFixed(2) + '%';
      }
    }
    
    res.json({
      funnel_counts: funnelData,
      conversion_rates: conversionRates
    });
  } catch (error) {
    console.error('Conversion funnel calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate conversion funnel' });
  }
});

// Get revenue analytics
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const periodDays = parseInt(period.replace('d', ''));
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    const revenueData = await Analytics.aggregate([
      {
        $match: {
          event_type: 'purchase',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          daily_revenue: { $sum: '$event_data.order_amount' },
          daily_orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json(revenueData);
  } catch (error) {
    console.error('Revenue calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate revenue data' });
  }
});

module.exports = router;

