interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  private level: number;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = LOG_LEVELS[envLevel as keyof LogLevel] ?? LOG_LEVELS.INFO;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
  }

  private log(level: number, levelName: string, message: string, ...args: any[]): void {
    if (level <= this.level) {
      const formattedMessage = this.formatMessage(levelName, message, ...args);
      
      if (level === LOG_LEVELS.ERROR) {
        console.error(formattedMessage);
      } else if (level === LOG_LEVELS.WARN) {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LOG_LEVELS.ERROR, 'ERROR', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LOG_LEVELS.WARN, 'WARN', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LOG_LEVELS.INFO, 'INFO', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LOG_LEVELS.DEBUG, 'DEBUG', message, ...args);
  }

  // Helper method for HTTP request logging
  request(method: string, url: string, statusCode: number, responseTime?: number): void {
    const message = `${method} ${url} ${statusCode}${responseTime ? ` - ${responseTime}ms` : ''}`;
    
    if (statusCode >= 500) {
      this.error(message);
    } else if (statusCode >= 400) {
      this.warn(message);
    } else {
      this.info(message);
    }
  }

  // Helper method for database operations
  database(operation: string, table: string, duration?: number): void {
    const message = `DB ${operation} on ${table}${duration ? ` - ${duration}ms` : ''}`;
    this.debug(message);
  }
}

export const logger = new Logger();

