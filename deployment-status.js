#!/usr/bin/env node

/**
 * Digi-King Telegram Bot - Final Deployment Status Check
 * Comprehensive system health and configuration verification
 */

const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class DeploymentStatusChecker {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            overall_status: 'CHECKING',
            checks: {},
            recommendations: [],
            next_steps: []
        };
    }

    async checkEnvironmentConfig() {
        console.log('🔧 Checking Environment Configuration...');
        
        try {
            // Check .env file exists
            const envExists = fs.existsSync('.env');
            
            if (envExists) {
                const envContent = fs.readFileSync('.env', 'utf8');
                const hasToken = envContent.includes('TELEGRAM_BOT_TOKEN');
                const hasDB = envContent.includes('MONGODB_URI');
                const hasEmail = envContent.includes('EMAIL_HOST');
                
                this.results.checks.environment = {
                    status: hasToken && hasDB ? 'READY' : 'NEEDS_CONFIG',
                    details: {
                        env_file_exists: true,
                        telegram_token_configured: hasToken && !envContent.includes('your_bot_token_here'),
                        mongodb_configured: hasDB,
                        email_configured: hasEmail
                    }
                };
                
                if (!hasToken || envContent.includes('your_bot_token_here')) {
                    this.results.recommendations.push('Configure a valid Telegram Bot Token from @BotFather');
                }
            } else {
                this.results.checks.environment = {
                    status: 'MISSING_CONFIG',
                    details: { env_file_exists: false }
                };
                this.results.recommendations.push('Create .env file with required configuration');
            }
        } catch (error) {
            this.results.checks.environment = {
                status: 'ERROR',
                error: error.message
            };
        }
    }

    async checkDatabaseConnection() {
        console.log('🗄️  Checking MongoDB Connection...');
        
        try {
            require('dotenv').config();
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiking';
            
            await mongoose.connect(mongoUri);
            
            // Check collections
            const collections = await mongoose.connection.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            
            this.results.checks.database = {
                status: 'CONNECTED',
                details: {
                    uri: mongoUri.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials
                    collections: collectionNames,
                    total_collections: collectionNames.length
                }
            };
            
            await mongoose.disconnect();
        } catch (error) {
            this.results.checks.database = {
                status: 'CONNECTION_FAILED',
                error: error.message
            };
            this.results.recommendations.push('Ensure MongoDB is running and accessible');
        }
    }

    async checkProcesses() {
        console.log('⚙️  Checking Running Processes...');
        
        try {
            const { stdout } = await execAsync('ps aux | grep -E "(node|python3)" | grep -v grep');
            const processes = stdout.split('\n').filter(line => line.trim());
            
            const botProcess = processes.find(p => p.includes('src/index.js') || p.includes('launch-deploy.js'));
            const dashboardProcess = processes.find(p => p.includes('http.server') && p.includes('8081'));
            const monitorProcess = processes.find(p => p.includes('monitor-metrics.js'));
            const abTestProcess = processes.find(p => p.includes('ab-test-manager.js'));
            
            this.results.checks.processes = {
                status: (botProcess && dashboardProcess) ? 'RUNNING' : 'PARTIAL',
                details: {
                    telegram_bot: !!botProcess,
                    dashboard_server: !!dashboardProcess,
                    monitoring: !!monitorProcess,
                    ab_testing: !!abTestProcess,
                    total_processes: processes.length
                }
            };
            
            if (!botProcess) {
                this.results.recommendations.push('Start the Telegram bot with npm run start or ./launch.sh');
            }
            if (!dashboardProcess) {
                this.results.recommendations.push('Start the dashboard server on port 8081');
            }
        } catch (error) {
            this.results.checks.processes = {
                status: 'ERROR',
                error: error.message
            };
        }
    }

    async checkDashboardAccess() {
        console.log('📊 Checking Dashboard Access...');
        
        try {
            const response = await axios.get('http://localhost:8081/', { timeout: 5000 });
            
            this.results.checks.dashboard = {
                status: 'ACCESSIBLE',
                details: {
                    url: 'http://localhost:8081',
                    response_code: response.status,
                    content_length: response.data.length
                }
            };
        } catch (error) {
            this.results.checks.dashboard = {
                status: 'INACCESSIBLE',
                error: error.message
            };
            this.results.recommendations.push('Start dashboard server: python3 -m http.server 8081 --directory dashboard');
        }
    }

    async checkProjectStructure() {
        console.log('📁 Checking Project Structure...');
        
        const requiredFiles = [
            'package.json',
            'src/index.js',
            'handlers/admin.js',
            'handlers/subscription.js',
            'models/User.js',
            'models/Campaign.js',
            'models/Analytics.js',
            'dashboard/index.html',
            'MARKETING_STRATEGY.md'
        ];
        
        const missingFiles = [];
        const existingFiles = [];
        
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                existingFiles.push(file);
            } else {
                missingFiles.push(file);
            }
        }
        
        this.results.checks.project_structure = {
            status: missingFiles.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
            details: {
                total_required: requiredFiles.length,
                existing_files: existingFiles.length,
                missing_files: missingFiles
            }
        };
        
        if (missingFiles.length > 0) {
            this.results.recommendations.push(`Missing files: ${missingFiles.join(', ')}`);
        }
    }

    generateOverallStatus() {
        const checks = this.results.checks;
        const statuses = Object.values(checks).map(check => check.status);
        
        if (statuses.includes('ERROR') || statuses.includes('CONNECTION_FAILED')) {
            this.results.overall_status = 'CRITICAL_ISSUES';
        } else if (statuses.includes('NEEDS_CONFIG') || statuses.includes('MISSING_CONFIG')) {
            this.results.overall_status = 'NEEDS_CONFIGURATION';
        } else if (statuses.includes('PARTIAL') || statuses.includes('INACCESSIBLE')) {
            this.results.overall_status = 'PARTIALLY_DEPLOYED';
        } else if (statuses.every(s => ['READY', 'CONNECTED', 'RUNNING', 'ACCESSIBLE', 'COMPLETE'].includes(s))) {
            this.results.overall_status = 'FULLY_DEPLOYED';
        } else {
            this.results.overall_status = 'UNKNOWN';
        }
    }

    generateNextSteps() {
        const status = this.results.overall_status;
        
        switch (status) {
            case 'NEEDS_CONFIGURATION':
                this.results.next_steps = [
                    '1. Configure .env file with valid Telegram Bot Token',
                    '2. Ensure MongoDB is running',
                    '3. Run npm install to install dependencies',
                    '4. Start services with ./launch.sh'
                ];
                break;
                
            case 'PARTIALLY_DEPLOYED':
                this.results.next_steps = [
                    '1. Start missing services (bot, dashboard, monitoring)',
                    '2. Verify all processes are running',
                    '3. Test dashboard access at http://localhost:8081',
                    '4. Monitor logs for any errors'
                ];
                break;
                
            case 'FULLY_DEPLOYED':
                this.results.next_steps = [
                    '1. 🎉 System is fully deployed and ready!',
                    '2. Access dashboard at http://localhost:8081',
                    '3. Begin marketing campaigns',
                    '4. Monitor KPIs and A/B test results',
                    '5. Scale based on engagement metrics'
                ];
                break;
                
            case 'CRITICAL_ISSUES':
                this.results.next_steps = [
                    '1. Fix critical errors shown above',
                    '2. Check logs for detailed error messages',
                    '3. Verify system requirements are met',
                    '4. Re-run deployment status check'
                ];
                break;
        }
    }

    displayResults() {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 DIGI-KING TELEGRAM BOT - DEPLOYMENT STATUS REPORT');
        console.log('='.repeat(80));
        
        // Overall Status
        const statusEmoji = {
            'FULLY_DEPLOYED': '✅',
            'PARTIALLY_DEPLOYED': '⚠️',
            'NEEDS_CONFIGURATION': '🔧',
            'CRITICAL_ISSUES': '❌',
            'UNKNOWN': '❓'
        };
        
        console.log(`\n📋 OVERALL STATUS: ${statusEmoji[this.results.overall_status]} ${this.results.overall_status}`);
        console.log(`⏰ Checked at: ${this.results.timestamp}`);
        
        // Individual Checks
        console.log('\n📝 SYSTEM CHECKS:');
        for (const [checkName, checkResult] of Object.entries(this.results.checks)) {
            const emoji = checkResult.status.includes('ERROR') || checkResult.status.includes('FAILED') ? '❌' :
                         checkResult.status.includes('READY') || checkResult.status.includes('CONNECTED') || 
                         checkResult.status.includes('RUNNING') || checkResult.status.includes('ACCESSIBLE') ||
                         checkResult.status.includes('COMPLETE') ? '✅' : '⚠️';
            
            console.log(`  ${emoji} ${checkName.toUpperCase()}: ${checkResult.status}`);
            
            if (checkResult.details) {
                for (const [key, value] of Object.entries(checkResult.details)) {
                    console.log(`     └─ ${key}: ${value}`);
                }
            }
            
            if (checkResult.error) {
                console.log(`     ❌ Error: ${checkResult.error}`);
            }
        }
        
        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            this.results.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }
        
        // Next Steps
        console.log('\n🎯 NEXT STEPS:');
        this.results.next_steps.forEach(step => {
            console.log(`  ${step}`);
        });
        
        console.log('\n' + '='.repeat(80));
        
        // Save results to file
        fs.writeFileSync('deployment-status.json', JSON.stringify(this.results, null, 2));
        console.log('📄 Full report saved to: deployment-status.json');
        console.log('='.repeat(80));
    }

    async run() {
        console.log('🔍 Starting Digi-King Deployment Status Check...');
        
        await this.checkEnvironmentConfig();
        await this.checkDatabaseConnection();
        await this.checkProcesses();
        await this.checkDashboardAccess();
        await this.checkProjectStructure();
        
        this.generateOverallStatus();
        this.generateNextSteps();
        this.displayResults();
        
        return this.results;
    }
}

// Run the status check
if (require.main === module) {
    const checker = new DeploymentStatusChecker();
    checker.run().then(results => {
        const exitCode = results.overall_status === 'FULLY_DEPLOYED' ? 0 : 1;
        process.exit(exitCode);
    }).catch(error => {
        console.error('❌ Status check failed:', error);
        process.exit(1);
    });
}

module.exports = DeploymentStatusChecker;

