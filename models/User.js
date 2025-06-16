const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: false
  },
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false,
    validate: {
      validator: function(email) {
        return !email || validator.isEmail(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  isSubscribed: {
    type: Boolean,
    default: false
  },
  subscribedAt: {
    type: Date,
    default: null
  },
  unsubscribedAt: {
    type: Date,
    default: null
  },
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentTimestamp: {
    type: Date,
    default: null
  },
  marketingConsent: {
    type: Boolean,
    default: false
  },
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    newProducts: {
      type: Boolean,
      default: true
    }
  },
  segments: [{
    type: String,
    enum: ['new_customer', 'returning_customer', 'vip', 'inactive']
  }],
  totalPurchases: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastPurchaseDate: {
    type: Date,
    default: null
  },
  discountCodesUsed: [{
    code: String,
    usedAt: Date,
    campaignId: String,
    orderValue: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    default: 'en'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  botBlocked: {
    type: Boolean,
    default: false
  },
  credits: {
    type: Number,
    default: 0
  },
  creditsExpiry: {
    type: Date,
    default: null
  },
  waitingForEmail: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ telegramId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isSubscribed: 1 });
userSchema.index({ segments: 1 });

// Methods
userSchema.methods.updateSegment = function() {
  const segments = [];
  
  if (this.totalPurchases === 0) {
    segments.push('new_customer');
  } else if (this.totalPurchases > 0) {
    segments.push('returning_customer');
  }
  
  if (this.totalSpent > 1000) {
    segments.push('vip');
  }
  
  const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  if (this.lastInteraction < thirtyDaysAgo) {
    segments.push('inactive');
  }
  
  this.segments = segments;
};

userSchema.methods.addDiscountCode = function(code, campaignId, orderValue = 0) {
  this.discountCodesUsed.push({
    code,
    usedAt: new Date(),
    campaignId,
    orderValue
  });
  
  this.totalPurchases += 1;
  this.totalSpent += orderValue;
  this.lastPurchaseDate = new Date();
  
  this.updateSegment();
};

userSchema.methods.subscribe = function() {
  this.isSubscribed = true;
  this.subscribedAt = new Date();
  this.unsubscribedAt = null;
};

userSchema.methods.unsubscribe = function() {
  this.isSubscribed = false;
  this.unsubscribedAt = new Date();
};

module.exports = mongoose.model('User', userSchema);

