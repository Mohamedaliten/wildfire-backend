const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = this.getLogLevel();
  }

  getLogLevel() {
    const level = process.env.LOG_LEVEL || 'info';
    return LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const formattedMeta = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    
    return `[${timestamp}] ${level}: ${message} ${formattedMeta}`.trim();
  }

  error(message, meta = {}) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }
}

module.exports = new Logger();