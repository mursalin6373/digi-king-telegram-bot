#!/usr/bin/env node

const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

// Import models
const Analytics = require('./src/models/Analytics');
const Campaign = require('./src/models/Campaign');

class ABTestManager {
  constructor() {
    this.testConfigs = this.loadTestConfigs();
  }

  loadTestConfigs() {
    const configFile = './ab-test-config.json';
    if (fs.existsSync(configFile)) {
      try {
        return JSON.parse(fs.readFileSync(configFile, 'utf8'));
      } catch (error) {
        console.error('❌ Error loading A/B test config:', error.message);
      }
    }
    
    // Default configuration
    return {
      campaigns: [
        {
          name: 'welcome_message_test',
          variants: [
            { id: 'A', message: 'Welcome to Digi-King! 🎉 Get exclusive deals!' },
            { id: 'B', message: 'Join Digi-King for amazing digital products! 🚀' }
          ],
          traffic_split: 50,
          active: true
        },
        {
          name: 'discount_offer_test',
          variants: [
            { id: 'A', discount: 10, message: 'Get 10% off your first purchase!' },
            { id: 'B', discount: 15, message: 'Special 15% discount just for you!' }
          ],
          traffic_split: 50,
          active: true
        }
      ],
      weekly_rotation: true,
      auto_optimize: true
    };
  }

  saveTestConfigs() {
    try {
      fs.writeFileSync('./ab-test-config.json', JSON.stringify(this.testConfigs, null, 2));
    } catch (error) {
      console.error('❌ Error saving A/B test config:', error.message);
    }
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digi-king-bot');
      console.log('📋 Connected to database for A/B testing');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  getVariantForUser(userId, testName) {
    const test = this.testConfigs.campaigns.find(c => c.name === testName);
    if (!test || !test.active) {
      return test?.variants[0] || null;
    }

    // Use simple hash-based assignment for consistent user experience
    const hash = this.hashUserId(userId);
    const variantIndex = hash % test.variants.length;
    return test.variants[variantIndex];
  }

  hashUserId(userId) {
    let hash = 0;
    const str = userId.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async logTestEvent(userId, testName, variant, eventType, metadata = {}) {
    try {
      const analyticsData = {
        userId: userId,
        eventType: eventType,
        testVariant: `${testName}_${variant}`,
        metadata: {
          testName,
          variant,
          ...metadata
        },
        timestamp: new Date()
      };

      const analytics = new Analytics(analyticsData);
      await analytics.save();
      
      console.log(`📊 A/B Test Event: ${testName} - ${variant} - ${eventType}`);
    } catch (error) {
      console.error('❌ Error logging A/B test event:', error.message);
    }
  }

  async runWeeklyAnalysis() {
    console.log('📈 Running weekly A/B test analysis...');
    
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get all test results from the past week
      const testResults = await Analytics.aggregate([
        { 
          $match: { 
            timestamp: { $gte: weekAgo }, 
            testVariant: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$testVariant',
            conversions: { 
              $sum: { 
                $cond: [{ $eq: ['$eventType', 'conversion'] }, 1, 0] 
              }
            },
            clicks: { 
              $sum: { 
                $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] 
              }
            },
            views: { 
              $sum: { 
                $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] 
              }
            },
            total: { $sum: 1 }
          }
        },
        {
          $addFields: {
            conversionRate: {
              $cond: [
                { $gt: ['$clicks', 0] },
                { $multiply: [{ $divide: ['$conversions', '$clicks'] }, 100] },
                0
              ]
            },
            ctr: {
              $cond: [
                { $gt: ['$views', 0] },
                { $multiply: [{ $divide: ['$clicks', '$views'] }, 100] },
                0
              ]
            }
          }
        }
      ]);
      
      console.log('📊 A/B Test Results:');
      console.log(JSON.stringify(testResults, null, 2));
      
      // Save results for dashboard
      const resultsData = {
        timestamp: new Date(),
        period: 'weekly',
        results: testResults,
        analysis: this.analyzeResults(testResults)
      };
      
      fs.writeFileSync('./dashboard/ab-test-results.json', JSON.stringify(resultsData, null, 2));
      
      // Auto-optimize if enabled
      if (this.testConfigs.auto_optimize) {
        await this.autoOptimize(testResults);
      }
      
      return resultsData;
      
    } catch (error) {
      console.error('❌ A/B test analysis error:', error.message);
      return null;
    }
  }

  analyzeResults(results) {
    const analysis = {
      recommendations: [],
      winners: [],
      statistical_significance: {}
    };
    
    // Group results by test name
    const testGroups = {};
    results.forEach(result => {
      const [testName, variant] = result._id.split('_');
      if (!testGroups[testName]) {
        testGroups[testName] = [];
      }
      testGroups[testName].push({ variant, ...result });
    });
    
    // Analyze each test
    Object.entries(testGroups).forEach(([testName, variants]) => {
      if (variants.length >= 2) {
        // Find winner based on conversion rate
        const winner = variants.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        
        analysis.winners.push({
          test: testName,
          winner: winner.variant,
          conversionRate: winner.conversionRate.toFixed(2) + '%'
        });
        
        // Generate recommendations
        const improvementPotential = Math.max(...variants.map(v => v.conversionRate)) - 
                                    Math.min(...variants.map(v => v.conversionRate));
        
        if (improvementPotential > 5) {
          analysis.recommendations.push({
            test: testName,
            action: `Consider promoting variant ${winner.variant} - shows ${improvementPotential.toFixed(1)}% improvement`,
            confidence: improvementPotential > 10 ? 'high' : 'medium'
          });
        }
      }
    });
    
    return analysis;
  }

  async autoOptimize(results) {
    console.log('🤖 Running auto-optimization...');
    
    const testGroups = {};
    results.forEach(result => {
      const [testName, variant] = result._id.split('_');
      if (!testGroups[testName]) {
        testGroups[testName] = [];
      }
      testGroups[testName].push({ variant, ...result });
    });
    
    let optimizationsMade = 0;
    
    Object.entries(testGroups).forEach(([testName, variants]) => {
      if (variants.length >= 2) {
        const winner = variants.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        
        const loser = variants.reduce((worst, current) => 
          current.conversionRate < worst.conversionRate ? current : worst
        );
        
        // If winner has significantly better performance (>10% improvement)
        const improvement = winner.conversionRate - loser.conversionRate;
        if (improvement > 10 && winner.total > 50) { // Minimum sample size
          console.log(`🏆 Auto-optimizing ${testName}: Promoting variant ${winner.variant}`);
          
          // Update test configuration to favor the winner
          const testConfig = this.testConfigs.campaigns.find(c => c.name === testName);
          if (testConfig) {
            testConfig.traffic_split = 80; // Give 80% traffic to winner
            // You could also disable the losing variant here
            optimizationsMade++;
          }
        }
      }
    });
    
    if (optimizationsMade > 0) {
      this.saveTestConfigs();
      console.log(`✅ Applied ${optimizationsMade} auto-optimizations`);
    } else {
      console.log('ℹ️  No optimizations applied - insufficient data or performance difference');
    }
  }

  async startABTestFramework() {
    await this.connect();
    
    console.log('🧪 Starting A/B Testing Framework...');
    console.log('Active tests:', this.testConfigs.campaigns.map(c => c.name).join(', '));
    
    // Schedule weekly analysis (Sundays at midnight)
    cron.schedule('0 0 * * 0', async () => {
      await this.runWeeklyAnalysis();
    });
    
    // Schedule daily mini-analysis for quick insights
    cron.schedule('0 9 * * *', async () => {
      console.log('📊 Running daily A/B test check...');
      const results = await this.runWeeklyAnalysis();
      if (results && results.analysis.recommendations.length > 0) {
        console.log('💡 Daily Recommendations:');
        results.analysis.recommendations.forEach(rec => {
          console.log(`   ${rec.test}: ${rec.action} (${rec.confidence} confidence)`);
        });
      }
    });
    
    console.log('✅ A/B testing framework active!');
    console.log('📅 Weekly analysis: Sundays at midnight');
    console.log('📅 Daily check: 9 AM every day');
    
    return this;
  }

  // API methods for integration with the bot
  async getWelcomeMessage(userId) {
    const variant = this.getVariantForUser(userId, 'welcome_message_test');
    if (variant) {
      await this.logTestEvent(userId, 'welcome_message_test', variant.id, 'view');
      return variant.message;
    }
    return 'Welcome to Digi-King!';
  }

  async getDiscountOffer(userId) {
    const variant = this.getVariantForUser(userId, 'discount_offer_test');
    if (variant) {
      await this.logTestEvent(userId, 'discount_offer_test', variant.id, 'view');
      return {
        message: variant.message,
        discount: variant.discount
      };
    }
    return {
      message: 'Get 10% off your first purchase!',
      discount: 10
    };
  }

  async recordClick(userId, testName) {
    const variant = this.getVariantForUser(userId, testName);
    if (variant) {
      await this.logTestEvent(userId, testName, variant.id, 'click');
    }
  }

  async recordConversion(userId, testName, metadata = {}) {
    const variant = this.getVariantForUser(userId, testName);
    if (variant) {
      await this.logTestEvent(userId, testName, variant.id, 'conversion', metadata);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping A/B testing framework...');
  mongoose.connection.close();
  process.exit(0);
});

// Start framework if run directly
if (require.main === module) {
  const abTestManager = new ABTestManager();
  abTestManager.startABTestFramework().catch(error => {
    console.error('❌ A/B testing framework failed:', error.message);
    process.exit(1);
  });
}

module.exports = ABTestManager;

