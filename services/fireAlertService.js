// services/fireAlertService.js - Fire Alert Processing Service
const logger = require('../utils/logger');

class FireAlertService {
    constructor() {
        this.alertHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Process incoming fire alert data and determine emergency level
     */
    processFireAlert(alertData) {
        try {
            logger.info('🔥 Processing fire alert data');
            
            // Validate alert data
            if (!this.validateAlertData(alertData)) {
                throw new Error('Invalid alert data structure');
            }

            // Determine emergency severity
            const severity = this.calculateSeverity(alertData);
            
            // Create structured alert object
            const processedAlert = {
                id: this.generateAlertId(),
                type: 'FIRE_EMERGENCY',
                deviceId: alertData.deviceId,
                severity: severity,
                timestamp: new Date().toISOString(),
                data: {
                    temperature: alertData.temperature,
                    humidity: alertData.humidity,
                    smoke_level: alertData.smoke_level,
                    air_quality: alertData.air_quality,
                    location: alertData.location
                },
                emergency: true,
                processed: true
            };

            // Store in history
            this.addToHistory(processedAlert);

            logger.info(`✅ Fire alert processed: ${severity} level emergency`);
            return processedAlert;

        } catch (error) {
            logger.error('❌ Error processing fire alert:', error);
            throw error;
        }
    }

    /**
     * Validate incoming alert data structure
     */
    validateAlertData(data) {
        const required = ['deviceId', 'temperature', 'location'];
        
        for (const field of required) {
            if (!data[field]) {
                logger.error(`❌ Missing required field: ${field}`);
                return false;
            }
        }

        // Validate location structure
        if (!data.location.latitude || !data.location.longitude) {
            logger.error('❌ Invalid location data');
            return false;
        }

        return true;
    }

    /**
     * Calculate emergency severity based on sensor data
     */
    calculateSeverity(data) {
        let severityScore = 0;

        // Temperature scoring (higher = more severe)
        if (data.temperature > 60) severityScore += 3;
        else if (data.temperature > 45) severityScore += 2;
        else if (data.temperature > 35) severityScore += 1;

        // Humidity scoring (lower = more severe)
        if (data.humidity < 20) severityScore += 3;
        else if (data.humidity < 35) severityScore += 2;
        else if (data.humidity < 50) severityScore += 1;

        // Smoke level scoring
        if (data.smoke_level > 300) severityScore += 3;
        else if (data.smoke_level > 200) severityScore += 2;
        else if (data.smoke_level > 100) severityScore += 1;

        // Air quality scoring
        if (data.air_quality > 250) severityScore += 2;
        else if (data.air_quality > 150) severityScore += 1;

        // Determine severity level
        if (severityScore >= 8) return 'EXTREME';
        if (severityScore >= 6) return 'CRITICAL';
        if (severityScore >= 4) return 'HIGH';
        if (severityScore >= 2) return 'MODERATE';
        return 'LOW';
    }

    /**
     * Generate unique alert ID
     */
    generateAlertId() {
        return `FIRE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add alert to history with size management
     */
    addToHistory(alert) {
        this.alertHistory.unshift(alert);
        
        // Keep only the most recent alerts
        if (this.alertHistory.length > this.maxHistorySize) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Get recent fire alerts
     */
    getRecentAlerts(limit = 10) {
        return this.alertHistory.slice(0, limit);
    }

    /**
     * Get alert statistics
     */
    getAlertStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const last24hAlerts = this.alertHistory.filter(alert => 
            new Date(alert.timestamp) > last24h
        );
        
        const lastWeekAlerts = this.alertHistory.filter(alert => 
            new Date(alert.timestamp) > lastWeek
        );

        return {
            total: this.alertHistory.length,
            last24Hours: last24hAlerts.length,
            lastWeek: lastWeekAlerts.length,
            severityBreakdown: this.getSeverityBreakdown(),
            timestamp: now.toISOString()
        };
    }

    /**
     * Get severity breakdown of recent alerts
     */
    getSeverityBreakdown() {
        const breakdown = {
            EXTREME: 0,
            CRITICAL: 0,
            HIGH: 0,
            MODERATE: 0,
            LOW: 0
        };

        this.alertHistory.forEach(alert => {
            if (breakdown[alert.severity] !== undefined) {
                breakdown[alert.severity]++;
            }
        });

        return breakdown;
    }

    /**
     * Create broadcast-ready emergency data
     */
    createEmergencyBroadcast(alertData) {
        const processedAlert = this.processFireAlert(alertData);
        
        return {
            type: 'FIRE_EMERGENCY',
            level: processedAlert.severity,
            title: `🚨 ${processedAlert.severity} FIRE EMERGENCY!`,
            message: `Fire emergency detected by ${processedAlert.deviceId}`,
            alert: processedAlert,
            ui: {
                showPopup: true,
                autoExpire: processedAlert.severity === 'LOW' || processedAlert.severity === 'MODERATE',
                sound: true,
                vibrate: true,
                priority: processedAlert.severity === 'EXTREME' || processedAlert.severity === 'CRITICAL' ? 'HIGH' : 'NORMAL',
                color: this.getSeverityColor(processedAlert.severity)
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get color code for severity level
     */
    getSeverityColor(severity) {
        const colors = {
            EXTREME: '#8B0000',  // Dark red
            CRITICAL: '#FF0000', // Red
            HIGH: '#FF4500',     // Orange red
            MODERATE: '#FFA500', // Orange
            LOW: '#FFD700'       // Gold
        };
        return colors[severity] || '#FF0000';
    }
}

// Export singleton instance
module.exports = new FireAlertService();