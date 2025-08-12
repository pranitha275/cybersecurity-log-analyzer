class LogParser {
  constructor() {
    this.parsers = {
      'zscaler': this.parseZscalerLog.bind(this),
      'apache': this.parseApacheLog.bind(this),
      'nginx': this.parseNginxLog.bind(this),
      'windows': this.parseWindowsLog.bind(this),
      'linux': this.parseLinuxLog.bind(this),
      'generic': this.parseGenericLog.bind(this)
    };
  }

  /**
   * Main parsing function that parses log content directly
   */
  parseLogFile(content, filename = '') {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      
      const format = this.detectLogFormat(lines);
      const parser = this.parsers[format];
      
      if (!parser) {
        throw new Error(`Unsupported log format: ${format}`);
      }

      const parsedEntries = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim()) {
          try {
            const entry = parser(line, i);
            if (entry) {
              parsedEntries.push(entry);
            }
          } catch (error) {
            console.warn(`Failed to parse line ${i + 1}: ${error.message}`);
          }
        }
      }

      return parsedEntries;

    } catch (error) {
      throw new Error(`Failed to parse log file: ${error.message}`);
    }
  }

  /**
   * Auto-detect log format based on content
   */
  detectLogFormat(lines) {
    if (lines.length === 0) return 'generic';

    const sampleLines = lines.slice(0, 5);
    
    // ZScaler format detection - look for CSV format with URL and action fields
    if (sampleLines.some(line => {
      const parts = line.split(',');
      return parts.length >= 8 && 
             parts[3] && ['ALLOW', 'BLOCK', 'DENY'].includes(parts[3]) &&
             parts[4] && parts[4].startsWith('http');
    })) {
      return 'zscaler';
    }

    // Apache format detection
    if (sampleLines.some(line => line.match(/^\d+\.\d+\.\d+\.\d+.*\[.*\]/))) {
      return 'apache';
    }

    // Nginx format detection
    if (sampleLines.some(line => line.match(/^\d+\.\d+\.\d+\.\d+.*HTTP\/\d+\.\d+/))) {
      return 'nginx';
    }

    // Windows Event Log detection
    if (sampleLines.some(line => line.includes('Event ID') || line.includes('Source:'))) {
      return 'windows';
    }

    // Linux system log detection
    if (sampleLines.some(line => line.match(/^[A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+/))) {
      return 'linux';
    }

    return 'generic';
  }

  /**
   * Parse ZScaler proxy logs
   */
  parseZscalerLog(line, index) {
    const parts = line.split(',');
    if (parts.length < 8) return null;

    const timestamp = parts[0] || new Date().toISOString();
    const ipAddress = parts[1] || 'unknown';
    const action = parts[3] || 'unknown';
    const url = parts[4] || 'unknown';
    const category = parts[5] || 'unknown';

    return {
      timestamp: this.parseTimestamp(timestamp),
      ip_address: ipAddress,
      event_description: `${action} access to ${url} (Category: ${category})`,
      raw_log_line: line,
      log_type: 'zscaler'
    };
  }

  /**
   * Parse Apache access logs
   */
  parseApacheLog(line, index) {
    const match = line.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\d+)/);
    if (!match) return null;

    const [, ipAddress, timestamp, request, status, bytes] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      ip_address: ipAddress,
      event_description: `HTTP ${status} - ${request}`,
      raw_log_line: line,
      log_type: 'apache'
    };
  }

  /**
   * Parse Nginx access logs
   */
  parseNginxLog(line, index) {
    const match = line.match(/^(\S+) - \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\d+)/);
    if (!match) return null;

    const [, ipAddress, timestamp, request, status, bytes] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      ip_address: ipAddress,
      event_description: `HTTP ${status} - ${request}`,
      raw_log_line: line,
      log_type: 'nginx'
    };
  }

  /**
   * Parse Windows Event Logs
   */
  parseWindowsLog(line, index) {
    // Simple parsing for Windows event logs
    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
    const ipAddress = ipMatch ? ipMatch[1] : 'unknown';
    
    return {
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      event_description: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
      raw_log_line: line,
      log_type: 'windows'
    };
  }

  /**
   * Parse Linux system logs
   */
  parseLinuxLog(line, index) {
    const match = line.match(/^([A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(.+)/);
    if (!match) return null;

    const [, timestamp, hostname, message] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      ip_address: hostname,
      event_description: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      raw_log_line: line,
      log_type: 'linux'
    };
  }

  /**
   * Parse generic log format
   */
  parseGenericLog(line, index) {
    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
    const ipAddress = ipMatch ? ipMatch[1] : 'unknown';
    
    return {
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      event_description: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
      raw_log_line: line,
      log_type: 'generic'
    };
  }

  /**
   * Parse various timestamp formats
   */
  parseTimestamp(timestamp) {
    try {
      // Try to parse common timestamp formats
      if (timestamp.includes('/')) {
        // Format: 12/Aug/2024:10:30:45 +0000
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try ISO format
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // Fallback to current time
      return new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }
}

export const parseLogFile = (content, filename) => {
  const parser = new LogParser();
  return parser.parseLogFile(content, filename);
}; 