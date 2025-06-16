const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const affiliateSchema = new mongoose.Schema({
  affiliateId: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  firstName: String,
  lastName: String,
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated'],
    default: 'pending'
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  commissionRate: {
    type: Number,
    default: 0.10 // 10% default commission
  },
  bankingInfo: {
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    paypalEmail: String,
    preferredMethod: {
      type: String,
      enum: ['bank', 'paypal', 'crypto'],
      default: 'paypal'
    }
  },
  performance: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    successfulReferrals: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    pendingEarnings: {
      type: Number,
      default: 0
    },
    paidEarnings: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  referrals: [{
    userId: String,
    orderValue: Number,
    commission: Number,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'paid'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    paidAt: Date
  }],
  payouts: [{
    amount: Number,
    method: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }],
  marketingMaterials: {
    accessLevel: {
      type: String,
      enum: ['basic', 'premium', 'vip'],
      default: 'basic'
    },
    downloadedAssets: [{
      assetName: String,
      downloadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
affiliateSchema.index({ affiliateId: 1 });
affiliateSchema.index({ telegramId: 1 });
affiliateSchema.index({ referralCode: 1 });
affiliateSchema.index({ status: 1 });
affiliateSchema.index({ tier: 1 });

// Methods
affiliateSchema.methods.addReferral = function(userId, orderValue) {
  const commission = orderValue * this.commissionRate;
  
  this.referrals.push({
    userId,
    orderValue,
    commission,
    status: 'pending'
  });
  
  this.performance.totalReferrals += 1;
  this.performance.pendingEarnings += commission;
  this.updateTier();
  this.lastActivityAt = new Date();
};

affiliateSchema.methods.confirmReferral = function(userId, orderValue) {
  const referral = this.referrals.find(r => r.userId === userId && r.orderValue === orderValue);
  if (referral && referral.status === 'pending') {
    referral.status = 'confirmed';
    this.performance.successfulReferrals += 1;
    this.performance.pendingEarnings -= referral.commission;
    this.performance.totalEarnings += referral.commission;
    this.updateConversionRate();
    this.updateTier();
  }
};

affiliateSchema.methods.updateConversionRate = function() {
  if (this.performance.totalReferrals > 0) {
    this.performance.conversionRate = this.performance.successfulReferrals / this.performance.totalReferrals;
  }
};

affiliateSchema.methods.updateTier = function() {
  const earnings = this.performance.totalEarnings;
  
  if (earnings >= 10000) {
    this.tier = 'platinum';
    this.commissionRate = 0.20;
  } else if (earnings >= 5000) {
    this.tier = 'gold';
    this.commissionRate = 0.15;
  } else if (earnings >= 1000) {
    this.tier = 'silver';
    this.commissionRate = 0.12;
  } else {
    this.tier = 'bronze';
    this.commissionRate = 0.10;
  }
};

affiliateSchema.methods.canRequestPayout = function() {
  return this.performance.totalEarnings >= 100; // Minimum $100 for payout
};

affiliateSchema.methods.requestPayout = function(amount, method) {
  if (amount > this.performance.totalEarnings) {
    throw new Error('Insufficient earnings for payout');
  }
  
  if (!this.canRequestPayout()) {
    throw new Error('Minimum payout amount not reached');
  }
  
  this.payouts.push({
    amount,
    method,
    status: 'pending'
  });
  
  this.performance.totalEarnings -= amount;
  this.performance.pendingEarnings += amount;
};

module.exports = mongoose.model('Affiliate', affiliateSchema);

