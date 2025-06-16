const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Social Media Analytics Tracker for Digi-King
 * Tracks engagement across all platforms and generates reports
 */

class SocialMediaAnalytics {
    constructor() {
        this.platforms = {
            buffer: {
                apiUrl: 'https://api.bufferapp.com/1/',
                accessToken: process.env.BUFFER_ACCESS_TOKEN,
                profiles: {
                    instagram: process.env.BUFFER_INSTAGRAM_PROFILE_ID,
                    twitter: process.env.BUFFER_TWITTER_PROFILE_ID,
                    linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID,
                    facebook: process.env.BUFFER_FACEBOOK_PROFILE_ID
                }
            },
            telegram: {
                botToken: process.env.TELEGRAM_BOT_TOKEN,
                channelId: process.env.TELEGRAM_CHANNEL_ID
            },
            instagram: {
                accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
                businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
            },
            twitter: {
                bearerToken: process.env.TWITTER_BEARER_TOKEN,
                apiKey: process.env.TWITTER_API_KEY,
                apiSecret: process.env.TWITTER_API_SECRET
            },
            linkedin: {
                accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
                companyId: process.env.LINKEDIN_COMPANY_ID
            },
            facebook: {
                accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
                pageId: process.env.FACEBOOK_PAGE_ID
            }
        };
        
        this.metricsHistory = [];
        this.loadMetricsHistory();
    }

    /**
     * Load historical metrics from file
     */
    loadMetricsHistory() {
        try {
            const historyPath = path.join(__dirname, 'metrics_history.json');
            if (fs.existsSync(historyPath)) {
                this.metricsHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                console.log(`Loaded ${this.metricsHistory.length} historical data points`);
            }
        } catch (error) {
            console.error('Error loading metrics history:', error);
        }
    }

    /**
     * Save metrics history to file
     */
    saveMetricsHistory() {
        try {
            const historyPath = path.join(__dirname, 'metrics_history.json');
            fs.writeFileSync(historyPath, JSON.stringify(this.metricsHistory, null, 2));
            console.log('Metrics history saved successfully');
        } catch (error) {
            console.error('Error saving metrics history:', error);
        }
    }

    /**
     * Collect analytics from all platforms
     */
    async collectAllAnalytics() {
        const timestamp = new Date().toISOString();
        const analytics = {
            timestamp,
            platforms: {},
            summary: {
                totalFollowers: 0,
                totalEngagement: 0,
                totalReach: 0,
                totalImpressions: 0
            }
        };

        try {
            // Collect from each platform
            analytics.platforms.instagram = await this.getInstagramAnalytics();
            analytics.platforms.twitter = await this.getTwitterAnalytics();
            analytics.platforms.linkedin = await this.getLinkedInAnalytics();
            analytics.platforms.facebook = await this.getFacebookAnalytics();
            analytics.platforms.telegram = await this.getTelegramAnalytics();

            // Calculate summary metrics
            Object.values(analytics.platforms).forEach(platform => {
                if (platform && platform.followers) {
                    analytics.summary.totalFollowers += platform.followers || 0;
                    analytics.summary.totalEngagement += platform.engagement || 0;
                    analytics.summary.totalReach += platform.reach || 0;
                    analytics.summary.totalImpressions += platform.impressions || 0;
                }
            });

            // Add to history
            this.metricsHistory.push(analytics);
            
            // Keep only last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            this.metricsHistory = this.metricsHistory.filter(
                metric => new Date(metric.timestamp) > ninetyDaysAgo
            );

            this.saveMetricsHistory();
            return analytics;

        } catch (error) {
            console.error('Error collecting analytics:', error);
            return null;
        }
    }

    /**
     * Get Instagram analytics using Instagram Graph API
     */
    async getInstagramAnalytics() {
        try {
            const baseUrl = 'https://graph.facebook.com/v18.0';
            const accountId = this.platforms.instagram.businessAccountId;
            const accessToken = this.platforms.instagram.accessToken;

            // Get account insights
            const insightsUrl = `${baseUrl}/${accountId}/insights`;
            const insightsParams = {
                metric: 'follower_count,reach,impressions,profile_views',
                period: 'day',
                since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                until: new Date().toISOString().split('T')[0],
                access_token: accessToken
            };

            const insightsResponse = await axios.get(insightsUrl, { params: insightsParams });
            const insights = insightsResponse.data.data;

            // Get recent posts engagement
            const postsUrl = `${baseUrl}/${accountId}/media`;
            const postsParams = {
                fields: 'id,caption,media_type,timestamp,like_count,comments_count,shares_count',
                limit: 10,
                access_token: accessToken
            };

            const postsResponse = await axios.get(postsUrl, { params: postsParams });
            const posts = postsResponse.data.data;

            // Calculate engagement metrics
            let totalLikes = 0;
            let totalComments = 0;
            let totalShares = 0;

            posts.forEach(post => {
                totalLikes += post.like_count || 0;
                totalComments += post.comments_count || 0;
                totalShares += post.shares_count || 0;
            });

            const followerCount = insights.find(i => i.name === 'follower_count');
            const reach = insights.find(i => i.name === 'reach');
            const impressions = insights.find(i => i.name === 'impressions');
            const profileViews = insights.find(i => i.name === 'profile_views');

            return {
                platform: 'instagram',
                followers: followerCount?.values?.[0]?.value || 0,
                reach: reach?.values?.reduce((sum, v) => sum + (v.value || 0), 0) || 0,
                impressions: impressions?.values?.reduce((sum, v) => sum + (v.value || 0), 0) || 0,
                profileViews: profileViews?.values?.reduce((sum, v) => sum + (v.value || 0), 0) || 0,
                engagement: totalLikes + totalComments + totalShares,
                engagementRate: followerCount?.values?.[0]?.value ? 
                    ((totalLikes + totalComments + totalShares) / followerCount.values[0].value * 100).toFixed(2) : 0,
                postsAnalyzed: posts.length,
                avgLikesPerPost: posts.length ? (totalLikes / posts.length).toFixed(1) : 0,
                avgCommentsPerPost: posts.length ? (totalComments / posts.length).toFixed(1) : 0
            };

        } catch (error) {
            console.error('Error getting Instagram analytics:', error);
            return { platform: 'instagram', error: error.message };
        }
    }

    /**
     * Get Twitter analytics using Twitter API v2
     */
    async getTwitterAnalytics() {
        try {
            const baseUrl = 'https://api.twitter.com/2';
            const bearerToken = this.platforms.twitter.bearerToken;

            // Get user info and metrics
            const userResponse = await axios.get(`${baseUrl}/users/me`, {
                params: {
                    'user.fields': 'public_metrics'
                },
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });

            const userMetrics = userResponse.data.data.public_metrics;

            // Get recent tweets
            const tweetsResponse = await axios.get(`${baseUrl}/users/me/tweets`, {
                params: {
                    max_results: 10,
                    'tweet.fields': 'public_metrics,created_at'
                },
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });

            const tweets = tweetsResponse.data.data || [];

            // Calculate engagement metrics
            let totalEngagement = 0;
            tweets.forEach(tweet => {
                const metrics = tweet.public_metrics;
                totalEngagement += (metrics.like_count || 0) + 
                                 (metrics.retweet_count || 0) + 
                                 (metrics.reply_count || 0) + 
                                 (metrics.quote_count || 0);
            });

            const engagementRate = userMetrics.followers_count ? 
                (totalEngagement / userMetrics.followers_count * 100).toFixed(2) : 0;

            return {
                platform: 'twitter',
                followers: userMetrics.followers_count,
                following: userMetrics.following_count,
                tweets: userMetrics.tweet_count,
                engagement: totalEngagement,
                engagementRate: engagementRate,
                tweetsAnalyzed: tweets.length,
                avgEngagementPerTweet: tweets.length ? (totalEngagement / tweets.length).toFixed(1) : 0
            };

        } catch (error) {
            console.error('Error getting Twitter analytics:', error);
            return { platform: 'twitter', error: error.message };
        }
    }

    /**
     * Get LinkedIn analytics using LinkedIn API
     */
    async getLinkedInAnalytics() {
        try {
            const baseUrl = 'https://api.linkedin.com/v2';
            const accessToken = this.platforms.linkedin.accessToken;
            const companyId = this.platforms.linkedin.companyId;

            // Get company followers
            const followersResponse = await axios.get(
                `${baseUrl}/networkSizes/urn:li:organization:${companyId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                }
            );

            // Get company posts
            const postsResponse = await axios.get(
                `${baseUrl}/shares`,
                {
                    params: {
                        q: 'owners',
                        owners: `urn:li:organization:${companyId}`,
                        count: 10
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                }
            );

            const posts = postsResponse.data.elements || [];
            const followers = followersResponse.data.firstDegreeSize || 0;

            // Note: LinkedIn API has limited engagement metrics access
            // This would require additional API calls for full engagement data

            return {
                platform: 'linkedin',
                followers: followers,
                posts: posts.length,
                engagement: 0, // Would need additional API calls
                engagementRate: 0,
                postsAnalyzed: posts.length
            };

        } catch (error) {
            console.error('Error getting LinkedIn analytics:', error);
            return { platform: 'linkedin', error: error.message };
        }
    }

    /**
     * Get Facebook analytics using Facebook Graph API
     */
    async getFacebookAnalytics() {
        try {
            const baseUrl = 'https://graph.facebook.com/v18.0';
            const pageId = this.platforms.facebook.pageId;
            const accessToken = this.platforms.facebook.accessToken;

            // Get page insights
            const insightsResponse = await axios.get(
                `${baseUrl}/${pageId}/insights`,
                {
                    params: {
                        metric: 'page_followers,page_impressions,page_engaged_users',
                        period: 'day',
                        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        until: new Date().toISOString().split('T')[0],
                        access_token: accessToken
                    }
                }
            );

            const insights = insightsResponse.data.data;

            // Get recent posts
            const postsResponse = await axios.get(
                `${baseUrl}/${pageId}/posts`,
                {
                    params: {
                        fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares',
                        limit: 10,
                        access_token: accessToken
                    }
                }
            );

            const posts = postsResponse.data.data || [];

            // Calculate engagement
            let totalEngagement = 0;
            posts.forEach(post => {
                totalEngagement += (post.likes?.summary?.total_count || 0) +
                                 (post.comments?.summary?.total_count || 0) +
                                 (post.shares?.count || 0);
            });

            const followers = insights.find(i => i.name === 'page_followers');
            const impressions = insights.find(i => i.name === 'page_impressions');
            const engagedUsers = insights.find(i => i.name === 'page_engaged_users');

            const followerCount = followers?.values?.[followers.values.length - 1]?.value || 0;

            return {
                platform: 'facebook',
                followers: followerCount,
                impressions: impressions?.values?.reduce((sum, v) => sum + (v.value || 0), 0) || 0,
                engagedUsers: engagedUsers?.values?.reduce((sum, v) => sum + (v.value || 0), 0) || 0,
                engagement: totalEngagement,
                engagementRate: followerCount ? (totalEngagement / followerCount * 100).toFixed(2) : 0,
                postsAnalyzed: posts.length
            };

        } catch (error) {
            console.error('Error getting Facebook analytics:', error);
            return { platform: 'facebook', error: error.message };
        }
    }

    /**
     * Get Telegram analytics using Bot API
     */
    async getTelegramAnalytics() {
        try {
            const botToken = this.platforms.telegram.botToken;
            const channelId = this.platforms.telegram.channelId;

            // Get channel info
            const chatResponse = await axios.get(
                `https://api.telegram.org/bot${botToken}/getChat`,
                {
                    params: {
                        chat_id: channelId
                    }
                }
            );

            const chatInfo = chatResponse.data.result;
            const memberCount = chatInfo.members_count || 0;

            // Note: Telegram Bot API has limited analytics
            // For detailed analytics, you'd need to track interactions manually
            // or use Telegram's built-in analytics for channels

            return {
                platform: 'telegram',
                subscribers: memberCount,
                engagement: 0, // Would need to track manually
                engagementRate: 0,
                channelTitle: chatInfo.title,
                channelDescription: chatInfo.description
            };

        } catch (error) {
            console.error('Error getting Telegram analytics:', error);
            return { platform: 'telegram', error: error.message };
        }
    }

    /**
     * Generate comprehensive analytics report
     */
    async generateReport(timeframe = '7d') {
        try {
            const currentAnalytics = await this.collectAllAnalytics();
            if (!currentAnalytics) {
                throw new Error('Failed to collect current analytics');
            }

            // Calculate growth metrics
            const growth = this.calculateGrowthMetrics(timeframe);
            
            const report = {
                generatedAt: new Date().toISOString(),
                timeframe: timeframe,
                current: currentAnalytics,
                growth: growth,
                insights: this.generateInsights(currentAnalytics, growth),
                recommendations: this.generateRecommendations(currentAnalytics, growth)
            };

            // Save report
            const reportPath = path.join(__dirname, '../reports', `analytics_${Date.now()}.json`);
            
            // Ensure reports directory exists
            const reportsDir = path.dirname(reportPath);
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }
            
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log('Analytics report generated:', reportPath);

            return report;

        } catch (error) {
            console.error('Error generating report:', error);
            return null;
        }
    }

    /**
     * Calculate growth metrics compared to previous period
     */
    calculateGrowthMetrics(timeframe) {
        const days = timeframe === '30d' ? 30 : 7;
        const now = new Date();
        const compareDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Find closest historical data point
        const historicalData = this.metricsHistory
            .filter(m => new Date(m.timestamp) <= compareDate)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (!historicalData) {
            return {
                followersGrowth: 0,
                engagementGrowth: 0,
                reachGrowth: 0,
                note: 'Insufficient historical data for growth calculation'
            };
        }

        const current = this.metricsHistory[this.metricsHistory.length - 1];
        
        const followersGrowth = (
            (current.summary.totalFollowers - historicalData.summary.totalFollowers) /
            historicalData.summary.totalFollowers * 100
        ).toFixed(2);

        const engagementGrowth = (
            (current.summary.totalEngagement - historicalData.summary.totalEngagement) /
            (historicalData.summary.totalEngagement || 1) * 100
        ).toFixed(2);

        const reachGrowth = (
            (current.summary.totalReach - historicalData.summary.totalReach) /
            (historicalData.summary.totalReach || 1) * 100
        ).toFixed(2);

        return {
            followersGrowth: parseFloat(followersGrowth),
            engagementGrowth: parseFloat(engagementGrowth),
            reachGrowth: parseFloat(reachGrowth),
            comparedTo: historicalData.timestamp
        };
    }

    /**
     * Generate insights based on analytics data
     */
    generateInsights(analytics, growth) {
        const insights = [];

        // Follower growth insights
        if (growth.followersGrowth > 5) {
            insights.push({
                type: 'positive',
                category: 'growth',
                message: `Excellent follower growth of ${growth.followersGrowth}%! Your content strategy is working.`
            });
        } else if (growth.followersGrowth < -2) {
            insights.push({
                type: 'warning',
                category: 'growth',
                message: `Follower decline of ${Math.abs(growth.followersGrowth)}%. Consider reviewing content quality and posting frequency.`
            });
        }

        // Engagement insights
        Object.values(analytics.platforms).forEach(platform => {
            if (platform.engagementRate) {
                const rate = parseFloat(platform.engagementRate);
                if (rate > 3) {
                    insights.push({
                        type: 'positive',
                        category: 'engagement',
                        message: `${platform.platform} has excellent engagement rate of ${rate}%`
                    });
                } else if (rate < 1) {
                    insights.push({
                        type: 'warning',
                        category: 'engagement',
                        message: `${platform.platform} engagement rate is low at ${rate}%. Consider more interactive content.`
                    });
                }
            }
        });

        // Platform performance insights
        const platformEngagement = Object.values(analytics.platforms)
            .filter(p => p.engagement && p.followers)
            .map(p => ({
                platform: p.platform,
                engagementRate: p.engagement / p.followers * 100
            }))
            .sort((a, b) => b.engagementRate - a.engagementRate);

        if (platformEngagement.length > 1) {
            insights.push({
                type: 'info',
                category: 'performance',
                message: `Best performing platform: ${platformEngagement[0].platform} with ${platformEngagement[0].engagementRate.toFixed(2)}% engagement rate`
            });
        }

        return insights;
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(analytics, growth) {
        const recommendations = [];

        // Content recommendations
        if (growth.engagementGrowth < 0) {
            recommendations.push({
                priority: 'high',
                category: 'content',
                action: 'Review content strategy',
                details: 'Engagement is declining. Consider more interactive content, polls, and questions.'
            });
        }

        // Posting frequency recommendations
        Object.values(analytics.platforms).forEach(platform => {
            if (platform.postsAnalyzed && platform.postsAnalyzed < 5) {
                recommendations.push({
                    priority: 'medium',
                    category: 'frequency',
                    action: `Increase posting frequency on ${platform.platform}`,
                    details: 'Low post count may be limiting reach and engagement.'
                });
            }
        });

        // Platform-specific recommendations
        if (analytics.platforms.instagram && analytics.platforms.instagram.engagementRate < 2) {
            recommendations.push({
                priority: 'medium',
                category: 'instagram',
                action: 'Improve Instagram engagement',
                details: 'Use more hashtags, stories, and interactive features like polls and questions.'
            });
        }

        if (analytics.platforms.telegram && analytics.platforms.telegram.subscribers < 100) {
            recommendations.push({
                priority: 'high',
                category: 'telegram',
                action: 'Grow Telegram channel',
                details: 'Promote Telegram channel across other platforms and offer exclusive content.'
            });
        }

        return recommendations;
    }

    /**
     * Track specific post performance
     */
    async trackPostPerformance(postId, platform) {
        try {
            // Implementation would depend on platform-specific APIs
            // This is a placeholder for post-specific tracking
            console.log(`Tracking post ${postId} on ${platform}`);
            return {
                postId,
                platform,
                metrics: {
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    reach: 0
                },
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error tracking post performance:', error);
            return null;
        }
    }

    /**
     * Get performance summary for dashboard
     */
    getPerformanceSummary() {
        if (this.metricsHistory.length === 0) {
            return {
                message: 'No historical data available',
                totalFollowers: 0,
                totalEngagement: 0
            };
        }

        const latest = this.metricsHistory[this.metricsHistory.length - 1];
        const weekAgo = this.metricsHistory.find(m => {
            const date = new Date(m.timestamp);
            const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return date <= weekAgoDate;
        });

        return {
            totalFollowers: latest.summary.totalFollowers,
            totalEngagement: latest.summary.totalEngagement,
            totalReach: latest.summary.totalReach,
            weeklyGrowth: weekAgo ? {
                followers: latest.summary.totalFollowers - weekAgo.summary.totalFollowers,
                engagement: latest.summary.totalEngagement - weekAgo.summary.totalEngagement
            } : null,
            lastUpdated: latest.timestamp
        };
    }
}

module.exports = SocialMediaAnalytics;

