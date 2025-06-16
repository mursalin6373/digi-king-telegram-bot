const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referralCode: {
    type: String,
    required: true
  },
  referrerUserId: {
    type: String,
    required: true
  },
  referredUserId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  rewardType: {
    type: String,
    enum: ['credit', 'discount', 'cashback'],
    default: 'credit'
  },
  referrerReward: {
    type: Number,
    default: 0
  },
  referredReward: {
    type: Number,
    default: 0
  },
  orderValue: {
    type: Number,
    default: 0
  },
  orderId: {
    type: String
  },
  completedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default 30 days to complete referral
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['telegram', 'web', 'email', 'social'],
      default: 'telegram'
    },
    campaign: String,
    utmParams: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    }
  }
}, {
  timestamps: true
});

// Indexes
referralSchema.index({ referralCode: 1 });
referralSchema.index({ referrerUserId: 1 });
referralSchema.index({ referredUserId: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ createdAt: -1 });
referralSchema.index({ expiresAt: 1 });

// Methods
referralSchema.methods.complete = function(orderValue, orderId) {
  this.status = 'completed';
  this.orderValue = orderValue;
  this.orderId = orderId;
  this.completedAt = new Date();
  
  // Calculate rewards (can be customized)
  this.referrerReward = Math.min(orderValue * 0.1, 50); // 10% up to $50
  this.referredReward = Math.min(orderValue * 0.05, 25); // 5% up to $25
};

referralSchema.methods.cancel = function() {
  this.status = 'cancelled';
};

referralSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

referralSchema.methods.isValid = function() {
  return this.status === 'pending' && !this.isExpired();
};

// Static methods
referralSchema.statics.findByCode = function(code) {
  return this.findOne({ referralCode: code, status: 'pending' });
};

referralSchema.statics.getStatsForUser = function(userId) {
  return this.aggregate([
    {
      $match: { referrerUserId: userId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRewards: { $sum: '$referrerReward' },
        totalOrderValue: { $sum: '$orderValue' }
      }
    }
  ]);
};

module.exports = mongoose.model('Referral', referralSchema);

