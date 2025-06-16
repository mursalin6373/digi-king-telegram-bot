
      const cron = require('node-cron');
      const Analytics = require('./src/models/Analytics');
      const mongoose = require('mongoose');
      require('dotenv').config();
      
      mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digi-king-bot');
      
      // Monitor metrics every 15 minutes
      cron.schedule('*/15 * * * *', async () => {
        try {
          const recentMetrics = await Analytics.find({
            timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
          }).sort({ timestamp: -1 }).limit(10);
          
          console.log('📊 Real-time metrics update:', new Date().toISOString());
          console.log('Recent events:', recentMetrics.length);
          
          if (recentMetrics.length > 0) {
            const eventTypes = recentMetrics.reduce((acc, metric) => {
              acc[metric.eventType] = (acc[metric.eventType] || 0) + 1;
              return acc;
            }, {});
            console.log('Event breakdown:', eventTypes);
          }
        } catch (error) {
          console.error('Monitoring error:', error.message);
        }
      });
      
      console.log('🔍 Real-time monitoring activated');
    