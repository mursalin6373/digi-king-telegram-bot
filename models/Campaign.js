const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const campaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['discount', 'new_product', 'newsletter', 'announcement', 'personalized'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  targetSegments: [{
    type: String,
    enum: ['all', 'new_customer', 'returning_customer', 'vip', 'inactive']
  }],
  message: {
    text: {
      type: String,
      required: true
    },
    parseMode: {
      type: String,
      enum: ['HTML', 'Markdown', 'MarkdownV2'],
      default: 'HTML'
    },
    disableWebPagePreview: {
      type: Boolean,
      default: false
    }
  },
  media: {
    type: {
      type: String,
      enum: ['photo', 'video', 'document', 'animation']
    },
    fileId: String,
    caption: String
  },
  inlineKeyboard: [{
    text: String,
    url: String,
    callbackData: String
  }],
  discountCode: {
    code: String,
    percentage: Number,
    fixedAmount: Number,
    minOrderValue: Number,
    maxUses: Number,
    usedCount: {
      type: Number,
      default: 0
    },
    expiryDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  scheduling: {
    sendAt: Date,
    timezone: {
      type: String,
      default: 'UTC'
    },
    recurring: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      dayOfWeek: Number, // 0-6 for weekly
      dayOfMonth: Number, // 1-31 for monthly
      time: String // HH:MM format
    }
  },
  analytics: {
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: String,
  sentAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ campaignId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ 'scheduling.sendAt': 1 });
campaignSchema.index({ targetSegments: 1 });

// Methods
campaignSchema.methods.incrementAnalytics = function(metric, value = 1) {
  if (this.analytics[metric] !== undefined) {
    this.analytics[metric] += value;
  }
};

campaignSchema.methods.canSend = function() {
  return this.status === 'active' || this.status === 'scheduled';
};

campaignSchema.methods.isExpired = function() {
  if (this.discountCode && this.discountCode.expiryDate) {
    return new Date() > this.discountCode.expiryDate;
  }
  return false;
};

campaignSchema.methods.canUseDiscount = function() {
  if (!this.discountCode) return false;
  
  const isActive = this.discountCode.isActive;
  const notExpired = !this.isExpired();
  const hasUsesLeft = !this.discountCode.maxUses || 
                     this.discountCode.usedCount < this.discountCode.maxUses;
  
  return isActive && notExpired && hasUsesLeft;
};

module.exports = mongoose.model('Campaign', campaignSchema);

