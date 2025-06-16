#!/usr/bin/env node

const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

// Import models
const Analytics = require('./src/models/Analytics');
const User = require('./src/models/User');
const Campaign = require('./src/models/Campaign');

class MetricsMonitor {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digi-king-bot');
      this.isConnected = true;
      console.log('📋 Connected to database for metrics monitoring');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async getRealtimeMetrics() {
    if (!this.isConnected) return null;

    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Get recent analytics data
      const hourlyMetrics = await Analytics.find({
        timestamp: { $gte: oneHourAgo }
      }).sort({ timestamp: -1 });
      
      const dailyMetrics = await Analytics.find({
        timestamp: { $gte: oneDayAgo }
      });
      
      // Get user stats
      const totalUsers = await User.countDocuments();
      const newUsersToday = await User.countDocuments({
        createdAt: { $gte: oneDayAgo }
      });
      
      // Get active campaigns
      const activeCampaigns = await Campaign.countDocuments({
        isActive: true
      });
      
      // Process metrics by event type
      const hourlyEventBreakdown = this.processEventBreakdown(hourlyMetrics);
      const dailyEventBreakdown = this.processEventBreakdown(dailyMetrics);
      
      // Calculate conversion rates
      const conversions = dailyMetrics.filter(m => m.eventType === 'conversion');
      const clicks = dailyMetrics.filter(m => m.eventType === 'click');
      const conversionRate = clicks.length > 0 ? (conversions.length / clicks.length * 100).toFixed(2) : 0;
      
      return {
        timestamp: now,
        realtime: {
          users: {
            total: totalUsers,
            newToday: newUsersToday,
            activeCampaigns: activeCampaigns
          },
          engagement: {
            hourly: {
              total: hourlyMetrics.length,
              breakdown: hourlyEventBreakdown
            },
            daily: {
              total: dailyMetrics.length,
              breakdown: dailyEventBreakdown,
              conversionRate: `${conversionRate}%`
            }
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error fetching metrics:', error.message);
      return null;
    }
  }

  processEventBreakdown(metrics) {
    return metrics.reduce((acc, metric) => {
      acc[metric.eventType] = (acc[metric.eventType] || 0) + 1;
      return acc;
    }, {});
  }

  async saveMetricsToFile(metrics) {
    try {
      const dashboardDir = './dashboard';
      if (!fs.existsSync(dashboardDir)) {
        fs.mkdirSync(dashboardDir, { recursive: true });
      }
      
      // Save current metrics
      fs.writeFileSync(
        `${dashboardDir}/realtime-metrics.json`, 
        JSON.stringify(metrics, null, 2)
      );
      
      // Append to historical data
      const historyFile = `${dashboardDir}/metrics-history.json`;
      let history = [];
      
      if (fs.existsSync(historyFile)) {
        try {
          history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) {
          history = [];
        }
      }
      
      history.push({
        timestamp: metrics.timestamp,
        snapshot: metrics.realtime
      });
      
      // Keep only last 24 hours of history (288 5-minute intervals)
      if (history.length > 288) {
        history = history.slice(-288);
      }
      
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      
    } catch (error) {
      console.error('❌ Error saving metrics:', error.message);
    }
  }

  displayMetrics(metrics) {
    if (!metrics) return;
    
    console.clear();
    console.log('📊 DIGI-KING TELEGRAM BOT - REAL-TIME METRICS DASHBOARD');
    console.log('='.repeat(60));
    console.log(`🔄 Last Updated: ${new Date(metrics.timestamp).toLocaleString()}`);
    console.log('');
    
    console.log('👥 USER STATISTICS:');
    console.log(`   Total Users: ${metrics.realtime.users.total}`);
    console.log(`   New Today: ${metrics.realtime.users.newToday}`);
    console.log(`   Active Campaigns: ${metrics.realtime.users.activeCampaigns}`);
    console.log('');
    
    console.log('📊 ENGAGEMENT METRICS:');
    console.log('   Last Hour:');
    console.log(`     Total Events: ${metrics.realtime.engagement.hourly.total}`);
    Object.entries(metrics.realtime.engagement.hourly.breakdown).forEach(([event, count]) => {
      console.log(`     ${event}: ${count}`);
    });
    
    console.log('   Last 24 Hours:');
    console.log(`     Total Events: ${metrics.realtime.engagement.daily.total}`);
    console.log(`     Conversion Rate: ${metrics.realtime.engagement.daily.conversionRate}`);
    Object.entries(metrics.realtime.engagement.daily.breakdown).forEach(([event, count]) => {
      console.log(`     ${event}: ${count}`);
    });
    
    console.log('');
    console.log('🌐 Access Points:');
    console.log('   Dashboard: http://localhost:8080');
    console.log('   Bot API: http://localhost:3000');
    console.log('   Admin: http://localhost:3000/admin');
    console.log('');
    console.log('Press Ctrl+C to stop monitoring...');
  }

  async startMonitoring() {
    await this.connect();
    
    console.log('🔍 Starting real-time metrics monitoring...');
    console.log('Updating every 5 minutes...');
    
    // Initial fetch
    const initialMetrics = await this.getRealtimeMetrics();
    if (initialMetrics) {
      this.displayMetrics(initialMetrics);
      await this.saveMetricsToFile(initialMetrics);
    }
    
    // Schedule updates every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      const metrics = await this.getRealtimeMetrics();
      if (metrics) {
        this.displayMetrics(metrics);
        await this.saveMetricsToFile(metrics);
      }
    });
    
    // Also update every 30 seconds for more responsive display
    setInterval(async () => {
      const metrics = await this.getRealtimeMetrics();
      if (metrics) {
        this.displayMetrics(metrics);
      }
    }, 30000);
    
    console.log('✅ Real-time monitoring active!');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping metrics monitoring...');
  mongoose.connection.close();
  process.exit(0);
});

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new MetricsMonitor();
  monitor.startMonitoring().catch(error => {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  });
}

module.exports = MetricsMonitor;

