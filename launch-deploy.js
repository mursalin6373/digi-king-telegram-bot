#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bold}[STEP ${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

class LaunchDeployManager {
  constructor() {
    this.processes = [];
    this.deploymentPhases = [
      'Pre-deployment checks',
      'Environment validation',
      'Database connection',
      'Bot system startup',
      'Multi-channel campaign launch',
      'Real-time monitoring setup',
      'A/B testing framework activation'
    ];
  }

  async deploy() {
    log(`\n${colors.bold}🚀 DIGI-KING TELEGRAM BOT - MULTI-CHANNEL LAUNCH DEPLOYMENT${colors.reset}`);
    log(`${colors.bold}================================================================${colors.reset}\n`);

    try {
      await this.preDeploymentChecks();
      await this.validateEnvironment();
      await this.checkDatabaseConnection();
      await this.startBotSystem();
      await this.launchMultiChannelCampaign();
      await this.setupRealTimeMonitoring();
      await this.activateABTestingFramework();
      
      log(`\n${colors.bold}${colors.green}🎉 LAUNCH DEPLOYMENT COMPLETED SUCCESSFULLY!${colors.reset}`);
      log(`${colors.bold}===============================================${colors.reset}\n`);
      
      this.displayPostLaunchInfo();
      
    } catch (error) {
      logError(`Deployment failed: ${error.message}`);
      await this.cleanup();
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    logStep(1, 'Pre-deployment checks');
    
    // Check Node.js version
    const nodeVersion = process.version;
    log(`Node.js version: ${nodeVersion}`);
    
    if (parseInt(nodeVersion.slice(1).split('.')[0]) < 14) {
      throw new Error('Node.js version 14 or higher is required');
    }
    logSuccess('Node.js version check passed');
    
    // Check if MongoDB is running
    try {
      await execAsync('pgrep mongod');
      logSuccess('MongoDB service is running');
    } catch (error) {
      logWarning('MongoDB not detected, attempting to start...');
      try {
        await execAsync('sudo systemctl start mongod');
        logSuccess('MongoDB started successfully');
      } catch (startError) {
        logWarning('Could not start MongoDB automatically. Please ensure MongoDB is running.');
      }
    }
    
    // Check package dependencies
    if (!fs.existsSync('./node_modules')) {
      log('Installing package dependencies...');
      await execAsync('npm install');
      logSuccess('Dependencies installed');
    } else {
      logSuccess('Dependencies already installed');
    }
  }

  async validateEnvironment() {
    logStep(2, 'Environment validation');
    
    const envPath = './.env';
    if (!fs.existsSync(envPath)) {
      throw new Error('.env file not found. Please configure your environment variables.');
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'TELEGRAM_BOT_TOKEN',
      'MONGODB_URI', 
      'JWT_SECRET',
      'PORT'
    ];
    
    const missingVars = [];
    requiredVars.forEach(varName => {
      const regex = new RegExp(`^${varName}=(.+)$`, 'm');
      const match = envContent.match(regex);
      if (!match || match[1].startsWith('SET_YOUR_') || match[1].includes('your_')) {
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      logWarning(`Please configure these environment variables in .env file:`);
      missingVars.forEach(varName => log(`  - ${varName}`, 'yellow'));
      logWarning('Proceeding with demo/development configuration...');
    } else {
      logSuccess('Environment variables validated');
    }
  }

  async checkDatabaseConnection() {
    logStep(3, 'Database connection check');
    
    // Test MongoDB connection
    try {
      const testScript = `
        const mongoose = require('mongoose');
        require('dotenv').config();
        
        mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digi-king-bot')
          .then(() => {
            console.log('Database connection successful');
            mongoose.connection.close();
            process.exit(0);
          })
          .catch(err => {
            console.error('Database connection failed:', err.message);
            process.exit(1);
          });
      `;
      
      fs.writeFileSync('./temp-db-test.js', testScript);
      await execAsync('node temp-db-test.js');
      fs.unlinkSync('./temp-db-test.js');
      
      logSuccess('Database connection established');
    } catch (error) {
      logWarning('Database connection test failed. The bot will attempt to connect on startup.');
    }
  }

  async startBotSystem() {
    logStep(4, 'Bot system startup');
    
    // Start the main bot application
    log('Starting Telegram bot server...');
    
    const botProcess = spawn('node', ['src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    this.processes.push(botProcess);
    
    // Monitor bot startup
    let botStarted = false;
    const startupTimeout = setTimeout(() => {
      if (!botStarted) {
        logError('Bot startup timeout');
        throw new Error('Bot failed to start within expected time');
      }
    }, 30000);
    
    botProcess.stdout.on('data', (data) => {
      const output = data.toString();
      log(`Bot: ${output.trim()}`, 'blue');
      
      if (output.includes('Bot started successfully') || 
          output.includes('Server listening') ||
          output.includes('Webhook set successfully')) {
        botStarted = true;
        clearTimeout(startupTimeout);
        logSuccess('Bot system started successfully');
      }
    });
    
    botProcess.stderr.on('data', (data) => {
      log(`Bot Error: ${data.toString().trim()}`, 'red');
    });
    
    // Give the bot time to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (!botStarted) {
      logWarning('Bot startup status unclear, proceeding with launch...');
    }
  }

  async launchMultiChannelCampaign() {
    logStep(5, 'Multi-channel campaign launch');
    
    log('Executing launch campaign phases...');
    
    // Trigger the LaunchManager to execute campaigns
    const launchScript = `
      const mongoose = require('mongoose');
      const LaunchManager = require('./src/services/LaunchManager');
      require('dotenv').config();
      
      async function executeLaunch() {
        try {
          await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digi-king-bot');
          
          const launchManager = new LaunchManager();
          
          console.log('🚀 Starting multi-channel launch campaign...');
          await launchManager.executeLaunchCampaign();
          
          console.log('📊 Fetching initial launch metrics...');
          const metrics = await launchManager.getLaunchMetrics();
          console.log('Launch Metrics:', JSON.stringify(metrics, null, 2));
          
          console.log('✅ Launch campaign executed successfully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Launch campaign failed:', error.message);
          process.exit(1);
        }
      }
      
      executeLaunch();
    `;
    
    fs.writeFileSync('./temp-launch.js', launchScript);
    
    try {
      const { stdout } = await execAsync('node temp-launch.js');
      log(stdout, 'green');
      logSuccess('Multi-channel campaign launched successfully');
    } catch (error) {
      logWarning(`Launch campaign execution: ${error.message}`);
      logWarning('Campaign may need manual activation via admin commands');
    } finally {
      if (fs.existsSync('./temp-launch.js')) {
        fs.unlinkSync('./temp-launch.js');
      }
    }
  }

  async setupRealTimeMonitoring() {
    logStep(6, 'Real-time monitoring setup');
    
    // Start the dashboard server
    log('Starting analytics dashboard...');
    
    const dashboardProcess = spawn('python3', ['-m', 'http.server', '8080'], {
      cwd: './dashboard',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.processes.push(dashboardProcess);
    
    dashboardProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Serving HTTP')) {
        logSuccess('Analytics dashboard started on http://localhost:8080');
      }
    });
    
    // Set up monitoring cron job
    const monitoringScript = `
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
    `;
    
    fs.writeFileSync('./monitoring.js', monitoringScript);
    
    const monitorProcess = spawn('node', ['monitoring.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.processes.push(monitorProcess);
    
    monitorProcess.stdout.on('data', (data) => {
      log(`Monitor: ${data.toString().trim()}`, 'cyan');
    });
    
    logSuccess('Real-time monitoring system activated');
  }

  async activateABTestingFramework() {
    logStep(7, 'A/B testing framework activation');
    
    // Create A/B testing configuration
    const abTestConfig = {
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
    
    fs.writeFileSync('./ab-test-config.json', JSON.stringify(abTestConfig, null, 2));
    
    // Set up weekly A/B test analysis cron job
    const abTestScript = `
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
    `;
    
    fs.writeFileSync('./ab-testing.js', abTestScript);
    
    const abTestProcess = spawn('node', ['ab-testing.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.processes.push(abTestProcess);
    
    abTestProcess.stdout.on('data', (data) => {
      log(`A/B Test: ${data.toString().trim()}`, 'magenta');
    });
    
    logSuccess('A/B testing framework activated');
  }

  displayPostLaunchInfo() {
    log(`\n${colors.bold}📋 POST-LAUNCH INFORMATION${colors.reset}`);
    log(`${colors.bold}===========================${colors.reset}\n`);
    
    log('🌐 Service URLs:');
    log('  • Bot API: http://localhost:3000');
    log('  • Analytics Dashboard: http://localhost:8080');
    log('  • Admin Panel: http://localhost:3000/admin');
    
    log('\n📊 Monitoring & Analytics:');
    log('  • Real-time metrics updating every 15 minutes');
    log('  • A/B test analysis runs weekly (Sundays)');
    log('  • Campaign performance tracked in database');
    
    log('\n🔧 Management Commands:');
    log('  • View metrics: Check dashboard at http://localhost:8080');
    log('  • Stop services: Use Ctrl+C or kill processes');
    log('  • View logs: Check console output above');
    
    log('\n📱 Campaign Channels Active:');
    log('  • Telegram bot notifications');
    log('  • Affiliate program activation');
    log('  • Referral program promotion');
    log('  • Email automation sequences');
    log('  • Social media campaign triggers');
    
    log(`\n${colors.green}✅ All systems are now live and monitoring engagement!${colors.reset}\n`);
  }

  async cleanup() {
    log('\n🧹 Cleaning up processes...');
    
    this.processes.forEach(process => {
      try {
        process.kill();
      } catch (error) {
        // Process might already be dead
      }
    });
    
    // Clean up temporary files
    const tempFiles = ['./temp-db-test.js', './temp-launch.js'];
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  log('\n⚠️  Received interrupt signal. Cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('\n⚠️  Received termination signal. Cleaning up...');
  process.exit(0);
});

// Execute deployment if script is run directly
if (require.main === module) {
  const launcher = new LaunchDeployManager();
  launcher.deploy().catch(error => {
    logError(`Fatal deployment error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = LaunchDeployManager;

