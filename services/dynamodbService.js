// services/dynamodbService.js - DynamoDB service for wildfire device data
const AWS = require('aws-sdk');
const logger = require('../utils/logger');

class DynamoDBService {
  constructor() {
    // Configure AWS
    AWS.config.update({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    this.dynamoDb = new AWS.DynamoDB.DocumentClient();
    this.tableName = process.env.DYNAMODB_TABLE_NAME;
    
    // Configurable field names for your table structure
    this.timestampField = process.env.TIMESTAMP_FIELD || 'timestamp';
    this.deviceIdField = process.env.DEVICE_ID_FIELD || 'deviceId';
    
    if (!this.tableName) {
      throw new Error('DYNAMODB_TABLE_NAME environment variable is required');
    }
  }

  /**
   * Get the latest record for a specific device
   */
  async getLatestRecord(deviceId = null) {
    try {
      const actualDeviceId = deviceId || process.env.DEFAULT_DEVICE_ID;
      
      if (actualDeviceId) {
        // Try Query first (if you have partition key + sort key structure)
        try {
          const params = {
            TableName: this.tableName,
            KeyConditionExpression: `${this.deviceIdField} = :deviceId`,
            ExpressionAttributeValues: {
              ':deviceId': actualDeviceId
            },
            ScanIndexForward: false, // Sort in descending order
            Limit: 1
          };

          const result = await this.dynamoDb.query(params).promise();
          
          if (result.Items && result.Items.length > 0) {
            return result.Items[0];
          }
        } catch (queryError) {
          logger.warn('Query failed, falling back to scan:', queryError.message);
        }
      }
      
      // Fallback to Scan (works for any table structure)
      const scanParams = {
        TableName: this.tableName,
        Limit: 100
      };
      
      if (actualDeviceId) {
        scanParams.FilterExpression = `${this.deviceIdField} = :deviceId`;
        scanParams.ExpressionAttributeValues = {
          ':deviceId': actualDeviceId
        };
      }

      const result = await this.dynamoDb.scan(scanParams).promise();
      
      if (result.Items && result.Items.length > 0) {
        // Sort by timestamp field if it exists
        const sortedItems = result.Items.sort((a, b) => {
          const aTime = a[this.timestampField] || a.createdAt || a.updatedAt || 0;
          const bTime = b[this.timestampField] || b.createdAt || b.updatedAt || 0;
          return bTime - aTime;
        });
        
        return sortedItems[0];
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting latest record:', error);
      throw new Error(`Failed to get latest record: ${error.message}`);
    }
  }

  /**
   * Get all records for a device with pagination
   */
  async getDeviceData(deviceId = null, options = {}) {
    try {
      const {
        limit = 100,
        lastEvaluatedKey = null,
        startTime = null,
        endTime = null
      } = options;

      const actualDeviceId = deviceId || process.env.DEFAULT_DEVICE_ID;

      // Try Query first if we have a device ID
      if (actualDeviceId) {
        try {
          let keyConditionExpression = `${this.deviceIdField} = :deviceId`;
          const expressionAttributeValues = {
            ':deviceId': actualDeviceId
          };

          // Add time range filtering if provided
          if ((startTime || endTime) && this.timestampField) {
            const timestampAlias = '#ts';
            if (!params.ExpressionAttributeNames) {
              params.ExpressionAttributeNames = {};
            }
            params.ExpressionAttributeNames[timestampAlias] = this.timestampField;
            
            if (startTime && endTime) {
              keyConditionExpression += ` AND ${timestampAlias} BETWEEN :startTime AND :endTime`;
              expressionAttributeValues[':startTime'] = startTime;
              expressionAttributeValues[':endTime'] = endTime;
            } else if (startTime) {
              keyConditionExpression += ` AND ${timestampAlias} >= :startTime`;
              expressionAttributeValues[':startTime'] = startTime;
            } else if (endTime) {
              keyConditionExpression += ` AND ${timestampAlias} <= :endTime`;
              expressionAttributeValues[':endTime'] = endTime;
            }
          }

          const params = {
            TableName: this.tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ScanIndexForward: false, // Sort in descending order
            Limit: Math.min(limit, 1000)
          };

          if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
          }

          const result = await this.dynamoDb.query(params).promise();

          return {
            items: result.Items || [],
            count: result.Items ? result.Items.length : 0,
            lastEvaluatedKey: result.LastEvaluatedKey,
            hasMore: !!result.LastEvaluatedKey,
            source: 'query'
          };
        } catch (queryError) {
          logger.warn('Query failed, falling back to scan:', queryError.message);
        }
      }

      // Fallback to Scan
      const scanParams = {
        TableName: this.tableName,
        Limit: Math.min(limit, 1000)
      };

      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      // Add filters
      const filterExpressions = [];
      const expressionAttributeValues = {};

      if (actualDeviceId) {
        filterExpressions.push(`${this.deviceIdField} = :deviceId`);
        expressionAttributeValues[':deviceId'] = actualDeviceId;
      }

      const expressionAttributeNames = {};
      
      if (startTime && this.timestampField) {
        const timestampAlias = '#ts';
        expressionAttributeNames[timestampAlias] = this.timestampField;
        filterExpressions.push(`${timestampAlias} >= :startTime`);
        expressionAttributeValues[':startTime'] = startTime;
      }

      if (endTime && this.timestampField) {
        const timestampAlias = '#ts';
        expressionAttributeNames[timestampAlias] = this.timestampField;
        filterExpressions.push(`${timestampAlias} <= :endTime`);
        expressionAttributeValues[':endTime'] = endTime;
      }

      if (filterExpressions.length > 0) {
        scanParams.FilterExpression = filterExpressions.join(' AND ');
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
        
        if (Object.keys(expressionAttributeNames).length > 0) {
          scanParams.ExpressionAttributeNames = expressionAttributeNames;
        }
      }

      const result = await this.dynamoDb.scan(scanParams).promise();

      // Sort by timestamp if available
      let sortedItems = result.Items || [];
      if (this.timestampField) {
        sortedItems = sortedItems.sort((a, b) => 
          (b[this.timestampField] || 0) - (a[this.timestampField] || 0)
        );
      }

      return {
        items: sortedItems,
        count: sortedItems.length,
        lastEvaluatedKey: result.LastEvaluatedKey,
        hasMore: !!result.LastEvaluatedKey,
        source: 'scan'
      };
    } catch (error) {
      logger.error('Error getting device data:', error);
      throw new Error(`Failed to get device data: ${error.message}`);
    }
  }

  /**
   * Get all data across all devices (for analytics)
   */
  async getAllData(options = {}) {
    try {
      const {
        limit = 100,
        lastEvaluatedKey = null
      } = options;

      const params = {
        TableName: this.tableName,
        Limit: Math.min(limit, 1000)
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await this.dynamoDb.scan(params).promise();

      // Sort by timestamp if available
      let sortedItems = result.Items || [];
      if (this.timestampField) {
        sortedItems = sortedItems.sort((a, b) => 
          (b[this.timestampField] || 0) - (a[this.timestampField] || 0)
        );
      }

      return {
        items: sortedItems,
        count: sortedItems.length,
        lastEvaluatedKey: result.LastEvaluatedKey,
        hasMore: !!result.LastEvaluatedKey
      };
    } catch (error) {
      logger.error('Error getting all data:', error);
      throw new Error(`Failed to get all data: ${error.message}`);
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(deviceId = null, timeRange = '24h') {
    try {
      const now = Math.floor(Date.now() / 1000);
      let startTime;

      // Calculate start time based on range
      switch (timeRange) {
        case '1h':
          startTime = now - (60 * 60);
          break;
        case '24h':
          startTime = now - (24 * 60 * 60);
          break;
        case '7d':
          startTime = now - (7 * 24 * 60 * 60);
          break;
        case '30d':
          startTime = now - (30 * 24 * 60 * 60);
          break;
        default:
          startTime = now - (24 * 60 * 60);
      }

      const data = await this.getDeviceData(deviceId, {
        startTime,
        endTime: now,
        limit: 1000
      });

      // Calculate basic analytics
      const items = data.items;
      const totalRecords = items.length;
      
      if (totalRecords === 0) {
        return {
          totalRecords: 0,
          timeRange,
          latest: null,
          oldest: null,
          summary: 'No data available for the selected time range'
        };
      }

      const latest = items[0];
      const oldest = items[items.length - 1];

      // Calculate average values if numeric data exists
      let averageValue = null;
      let minValue = null;
      let maxValue = null;

      const numericValues = items
        .map(item => item.value)
        .filter(value => typeof value === 'number' && !isNaN(value));

      if (numericValues.length > 0) {
        averageValue = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        minValue = Math.min(...numericValues);
        maxValue = Math.max(...numericValues);
      }

      return {
        totalRecords,
        timeRange,
        latest,
        oldest,
        analytics: {
          averageValue: averageValue ? parseFloat(averageValue.toFixed(2)) : null,
          minValue,
          maxValue,
          dataPoints: numericValues.length
        }
      };
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      throw new Error(`Failed to get analytics summary: ${error.message}`);
    }
  }

  /**
   * Get unique device IDs
   */
  async getDeviceList() {
    try {
      const params = {
        TableName: this.tableName,
        ProjectionExpression: this.deviceIdField
      };

      const result = await this.dynamoDb.scan(params).promise();
      const deviceIds = [...new Set(result.Items.map(item => item[this.deviceIdField]))];
      
      return deviceIds.filter(id => id).sort();
    } catch (error) {
      logger.error('Error getting device list:', error);
      throw new Error(`Failed to get device list: ${error.message}`);
    }
  }

  /**
   * Test connection to DynamoDB table
   */
  async testConnection() {
    try {
      const params = {
        TableName: this.tableName,
        Limit: 1
      };

      await this.dynamoDb.scan(params).promise();
      return { 
        success: true, 
        message: `DynamoDB connection successful to table: ${this.tableName}`,
        tableName: this.tableName,
        timestampField: this.timestampField,
        deviceIdField: this.deviceIdField
      };
    } catch (error) {
      logger.error('DynamoDB connection test failed:', error);
      return { 
        success: false, 
        message: error.message,
        tableName: this.tableName 
      };
    }
  }
}

module.exports = new DynamoDBService();