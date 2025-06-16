
      const cron = require('node-cron');
      const fs = require('fs');
      const Analytics = require('./src/models/Analytics');
      const mongoose = require('mongoose');
      require('dotenv').config();
      
      mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digi-king-bot');
      
      // Run A/B test analysis every Sunday at midnight
      cron.schedule('0 0 * * 0', async () => {
        try {
          console.log('📈 Running weekly A/B test analysis...');
          
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const testResults = await Analytics.aggregate([
            { $match: { timestamp: { $gte: weekAgo }, testVariant: { $exists: true } } },
            { $group: {
                _id: '$testVariant',
                conversions: { $sum: { $cond: [{ $eq: ['$eventType', 'conversion'] }, 1, 0] } },
                clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] } },
                total: { $sum: 1 }
              }
            }
          ]);
          
          console.log('A/B Test Results:', JSON.stringify(testResults, null, 2));
          
          // Save results for dashboard
          fs.writeFileSync('./dashboard/ab-test-results.json', JSON.stringify({
            timestamp: new Date(),
            results: testResults
          }, null, 2));
          
        } catch (error) {
          console.error('A/B test analysis error:', error.message);
        }
      });
      
      console.log('🧪 A/B testing framework activated with weekly analysis');
    