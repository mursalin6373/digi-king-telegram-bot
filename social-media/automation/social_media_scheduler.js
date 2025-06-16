const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

/**
 * Social Media Automation Scheduler for Digi-King
 * Handles automated posting across multiple platforms
 */

class SocialMediaScheduler {
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
            }
        };
        
        this.contentLibrary = [];
        this.scheduledPosts = [];
        this.loadContentLibrary();
        this.initializeScheduler();
    }

    /**
     * Load content library from JSON file
     */
    loadContentLibrary() {
        try {
            const contentPath = path.join(__dirname, 'content_library.json');
            if (fs.existsSync(contentPath)) {
                this.contentLibrary = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
                console.log(`Loaded ${this.contentLibrary.length} content pieces`);
            }
        } catch (error) {
            console.error('Error loading content library:', error);
        }
    }

    /**
     * Initialize cron jobs for automated posting
     */
    initializeScheduler() {
        // Instagram posting schedule (11 AM, 2 PM, 5 PM EST)
        cron.schedule('0 11,14,17 * * *', () => {
            this.scheduleInstagramPost();
        }, {
            timezone: "America/New_York"
        });

        // Twitter posting schedule (9 AM, 12 PM, 3 PM, 6 PM EST)
        cron.schedule('0 9,12,15,18 * * *', () => {
            this.scheduleTwitterPost();
        }, {
            timezone: "America/New_York"
        });

        // LinkedIn posting schedule (8 AM, 12 PM, 5 PM EST, Tue-Thu)
        cron.schedule('0 8,12,17 * * 2-4', () => {
            this.scheduleLinkedInPost();
        }, {
            timezone: "America/New_York"
        });

        // Facebook posting schedule (1 PM, 3 PM, 8 PM EST)
        cron.schedule('0 13,15,20 * * *', () => {
            this.scheduleFacebookPost();
        }, {
            timezone: "America/New_York"
        });

        // Telegram posting schedule (9 AM, 2 PM, 7 PM EST)
        cron.schedule('0 9,14,19 * * *', () => {
            this.scheduleTelegramPost();
        }, {
            timezone: "America/New_York"
        });

        console.log('Social media scheduler initialized');
    }

    /**
     * Get content based on day theme and platform
     */
    getContentForDay(platform, theme) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const weekThemes = {
            1: 'motivation_monday',
            2: 'tech_tuesday', 
            3: 'wisdom_wednesday',
            4: 'throwback_thursday',
            5: 'feature_friday',
            6: 'success_saturday',
            0: 'sunday_spotlight'
        };

        const dayTheme = theme || weekThemes[dayOfWeek];
        const availableContent = this.contentLibrary.filter(content => 
            content.platform === platform && 
            content.theme === dayTheme &&
            !content.used_recently
        );

        if (availableContent.length === 0) {
            console.warn(`No available content for ${platform} - ${dayTheme}`);
            return null;
        }

        // Select random content and mark as recently used
        const selectedContent = availableContent[Math.floor(Math.random() * availableContent.length)];
        selectedContent.used_recently = true;
        selectedContent.last_used = new Date().toISOString();
        
        // Reset used_recently flag for content older than 30 days
        this.resetOldContent();
        
        return selectedContent;
    }

    /**
     * Reset used_recently flag for content older than 30 days
     */
    resetOldContent() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        this.contentLibrary.forEach(content => {
            if (content.last_used && new Date(content.last_used) < thirtyDaysAgo) {
                content.used_recently = false;
            }
        });
    }

    /**
     * Schedule Instagram post via Buffer API
     */
    async scheduleInstagramPost(customContent = null) {
        try {
            const content = customContent || this.getContentForDay('instagram');
            if (!content) return;

            const postData = {
                text: content.caption,
                media: content.media_url ? {
                    link: content.media_url,
                    description: content.caption
                } : null,
                scheduled_at: this.getNextPostTime('instagram')
            };

            const response = await this.postToBuffer('instagram', postData);
            console.log('Instagram post scheduled:', response.data);
            
            // Also post to Instagram Stories if content available
            if (content.story_content) {
                await this.scheduleInstagramStory(content.story_content);
            }
            
        } catch (error) {
            console.error('Error scheduling Instagram post:', error);
        }
    }

    /**
     * Schedule Twitter post via Buffer API
     */
    async scheduleTwitterPost(customContent = null) {
        try {
            const content = customContent || this.getContentForDay('twitter');
            if (!content) return;

            const postData = {
                text: content.text,
                media: content.media_url ? {
                    link: content.media_url
                } : null,
                scheduled_at: this.getNextPostTime('twitter')
            };

            const response = await this.postToBuffer('twitter', postData);
            console.log('Twitter post scheduled:', response.data);
            
            // Schedule thread if available
            if (content.thread && content.thread.length > 0) {
                await this.scheduleTwitterThread(content.thread);
            }
            
        } catch (error) {
            console.error('Error scheduling Twitter post:', error);
        }
    }

    /**
     * Schedule LinkedIn post via Buffer API
     */
    async scheduleLinkedInPost(customContent = null) {
        try {
            const content = customContent || this.getContentForDay('linkedin');
            if (!content) return;

            const postData = {
                text: content.text,
                media: content.media_url ? {
                    link: content.media_url,
                    description: content.description
                } : null,
                scheduled_at: this.getNextPostTime('linkedin')
            };

            const response = await this.postToBuffer('linkedin', postData);
            console.log('LinkedIn post scheduled:', response.data);
            
        } catch (error) {
            console.error('Error scheduling LinkedIn post:', error);
        }
    }

    /**
     * Schedule Facebook post via Buffer API
     */
    async scheduleFacebookPost(customContent = null) {
        try {
            const content = customContent || this.getContentForDay('facebook');
            if (!content) return;

            const postData = {
                text: content.text,
                media: content.media_url ? {
                    link: content.media_url,
                    description: content.description
                } : null,
                scheduled_at: this.getNextPostTime('facebook')
            };

            const response = await this.postToBuffer('facebook', postData);
            console.log('Facebook post scheduled:', response.data);
            
        } catch (error) {
            console.error('Error scheduling Facebook post:', error);
        }
    }

    /**
     * Schedule Telegram channel post
     */
    async scheduleTelegramPost(customContent = null) {
        try {
            const content = customContent || this.getContentForDay('telegram');
            if (!content) return;

            const telegramUrl = `https://api.telegram.org/bot${this.platforms.telegram.botToken}/sendMessage`;
            
            const postData = {
                chat_id: this.platforms.telegram.channelId,
                text: content.text,
                parse_mode: 'HTML',
                disable_web_page_preview: content.disable_preview || false
            };

            if (content.media_url) {
                // Send photo/video with caption
                const mediaUrl = content.media_type === 'video' ? 
                    `https://api.telegram.org/bot${this.platforms.telegram.botToken}/sendVideo` :
                    `https://api.telegram.org/bot${this.platforms.telegram.botToken}/sendPhoto`;
                
                const mediaData = {
                    chat_id: this.platforms.telegram.channelId,
                    caption: content.text,
                    parse_mode: 'HTML'
                };
                
                mediaData[content.media_type === 'video' ? 'video' : 'photo'] = content.media_url;
                
                const response = await axios.post(mediaUrl, mediaData);
                console.log('Telegram media post sent:', response.data);
            } else {
                const response = await axios.post(telegramUrl, postData);
                console.log('Telegram post sent:', response.data);
            }
            
        } catch (error) {
            console.error('Error sending Telegram post:', error);
        }
    }

    /**
     * Post to Buffer API
     */
    async postToBuffer(platform, postData) {
        const profileId = this.platforms.buffer.profiles[platform];
        const url = `${this.platforms.buffer.apiUrl}updates/create.json`;
        
        const data = {
            ...postData,
            profile_ids: [profileId],
            access_token: this.platforms.buffer.accessToken
        };

        return await axios.post(url, data);
    }

    /**
     * Get next optimal posting time for platform
     */
    getNextPostTime(platform) {
        const now = new Date();
        const schedules = {
            instagram: [11, 14, 17], // 11 AM, 2 PM, 5 PM
            twitter: [9, 12, 15, 18], // 9 AM, 12 PM, 3 PM, 6 PM
            linkedin: [8, 12, 17], // 8 AM, 12 PM, 5 PM
            facebook: [13, 15, 20] // 1 PM, 3 PM, 8 PM
        };

        const platformSchedule = schedules[platform];
        const currentHour = now.getHours();
        
        // Find next available time slot
        let nextHour = platformSchedule.find(hour => hour > currentHour);
        
        if (!nextHour) {
            // If no more slots today, schedule for first slot tomorrow
            nextHour = platformSchedule[0];
            now.setDate(now.getDate() + 1);
        }
        
        now.setHours(nextHour, 0, 0, 0);
        return Math.floor(now.getTime() / 1000); // Buffer API expects Unix timestamp
    }

    /**
     * Schedule Instagram Story
     */
    async scheduleInstagramStory(storyContent) {
        try {
            // Instagram Stories via Buffer (if supported) or direct API
            console.log('Scheduling Instagram Story:', storyContent);
            // Implementation depends on available APIs
        } catch (error) {
            console.error('Error scheduling Instagram Story:', error);
        }
    }

    /**
     * Schedule Twitter thread
     */
    async scheduleTwitterThread(threadContent) {
        try {
            // Schedule each tweet in the thread with delays
            for (let i = 0; i < threadContent.length; i++) {
                const delay = i * 30; // 30 second delay between tweets
                setTimeout(async () => {
                    const postData = {
                        text: threadContent[i],
                        scheduled_at: this.getNextPostTime('twitter') + delay
                    };
                    await this.postToBuffer('twitter', postData);
                }, delay * 1000);
            }
        } catch (error) {
            console.error('Error scheduling Twitter thread:', error);
        }
    }

    /**
     * Generate engagement report
     */
    async generateEngagementReport() {
        try {
            const report = {
                date: new Date().toISOString(),
                platforms: {},
                totalReach: 0,
                totalEngagement: 0,
                topPerformers: []
            };

            // Fetch analytics from Buffer API
            for (const [platform, profileId] of Object.entries(this.platforms.buffer.profiles)) {
                const analyticsUrl = `${this.platforms.buffer.apiUrl}profiles/${profileId}/analytics.json`;
                const response = await axios.get(analyticsUrl, {
                    params: { access_token: this.platforms.buffer.accessToken }
                });
                
                report.platforms[platform] = response.data;
                report.totalReach += response.data.reach || 0;
                report.totalEngagement += response.data.engagement || 0;
            }

            // Save report
            const reportPath = path.join(__dirname, '../reports', `engagement_${Date.now()}.json`);
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log('Engagement report generated:', reportPath);
            return report;
            
        } catch (error) {
            console.error('Error generating engagement report:', error);
        }
    }

    /**
     * Emergency post for breaking news or urgent updates
     */
    async emergencyPost(message, platforms = ['twitter', 'telegram']) {
        try {
            for (const platform of platforms) {
                const content = {
                    text: message,
                    urgent: true
                };
                
                switch (platform) {
                    case 'twitter':
                        await this.scheduleTwitterPost(content);
                        break;
                    case 'telegram':
                        await this.scheduleTelegramPost(content);
                        break;
                    case 'instagram':
                        await this.scheduleInstagramPost(content);
                        break;
                    case 'facebook':
                        await this.scheduleFacebookPost(content);
                        break;
                    case 'linkedin':
                        await this.scheduleLinkedInPost(content);
                        break;
                }
            }
            
            console.log('Emergency post sent to:', platforms);
        } catch (error) {
            console.error('Error sending emergency post:', error);
        }
    }

    /**
     * Save content library to file
     */
    saveContentLibrary() {
        try {
            const contentPath = path.join(__dirname, 'content_library.json');
            fs.writeFileSync(contentPath, JSON.stringify(this.contentLibrary, null, 2));
            console.log('Content library saved');
        } catch (error) {
            console.error('Error saving content library:', error);
        }
    }

    /**
     * Graceful shutdown
     */
    shutdown() {
        this.saveContentLibrary();
        console.log('Social media scheduler shut down gracefully');
    }
}

// Initialize scheduler if running directly
if (require.main === module) {
    const scheduler = new SocialMediaScheduler();
    
    // Graceful shutdown handling
    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully...');
        scheduler.shutdown();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        scheduler.shutdown();
        process.exit(0);
    });
}

module.exports = SocialMediaScheduler;

