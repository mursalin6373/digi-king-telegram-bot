const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['message_sent', 'message_delivered', 'message_failed', 'button_click', 'discount_used', 'subscription', 'unsubscription', 'user_interaction'],
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  campaignId: {
    type: String,
    required: false
  },
  messageId: {
    type: String,
    required: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['telegram', 'webhook', 'admin', 'cron'],
      default: 'telegram'
    }
  },
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
analyticsSchema.index({ type: 1, createdAt: -1 });
analyticsSchema.index({ userId: 1, createdAt: -1 });
analyticsSchema.index({ campaignId: 1, createdAt: -1 });
analyticsSchema.index({ 'metadata.timestamp': -1 });
analyticsSchema.index({ processed: 1 });

// Static methods for analytics reporting
analyticsSchema.statics.getCampaignStats = async function(campaignId, startDate, endDate) {
  const match = { campaignId };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        revenue: { 
          $sum: { 
            $cond: [
              { $eq: ['$type', 'discount_used'] },
              { $ifNull: ['$data.orderValue', 0] },
              0
            ]
          }
        }
      }
    }
  ]);
};

analyticsSchema.statics.getUserEngagement = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return await this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

analyticsSchema.statics.getTopPerformingCampaigns = async function(limit = 10, days = 30) {
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return await this.aggregate([
    {
      $match: {
        campaignId: { $exists: true, $ne: null },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$campaignId',
        totalInteractions: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{ $eq: ['$type', 'button_click'] }, 1, 0]
          }
        },
        conversions: {
          $sum: {
            $cond: [{ $eq: ['$type', 'discount_used'] }, 1, 0]
          }
        },
        revenue: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'discount_used'] },
              { $ifNull: ['$data.orderValue', 0] },
              0
            ]
          }
        }
      }
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ['$clicks', 0] },
            { $divide: ['$conversions', '$clicks'] },
            0
          ]
        }
      }
    },
    {
      $sort: { revenue: -1, conversionRate: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema);

