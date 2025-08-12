const fs = require('fs');

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
   * Main parsing function that detects format and parses accordingly
   */
  async parseLogFile(filePath, format = 'auto') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (format === 'auto') {
        format = this.detectLogFormat(lines);
      }

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

      return {
        format,
        totalLines: lines.length,
        parsedEntries,
        summary: this.generateSummary(parsedEntries)
      };

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
   * Parse ZScaler Web Proxy Logs
   */
  parseZscalerLog(line, lineNumber) {
    // ZScaler format: timestamp, source_ip, destination_ip, action, url, etc.
    const parts = line.split(',');
    if (parts.length < 8) return null;

    const timestamp = parts[0] || new Date().toISOString();
    const sourceIP = parts[1] || '';
    const destinationIP = parts[2] || '';
    const action = parts[3] || '';
    const url = parts[4] || '';
    const category = parts[5] || '';
    const user = parts[6] || '';
    const reason = parts[7] || '';

    return {
      timestamp: this.parseTimestamp(timestamp),
      ip_address: sourceIP,
      destination_ip: destinationIP,
      event_description: `ZScaler: ${action} - ${url} (Category: ${category})`,
      user: user,
      url: url,
      category: category,
      action: action,
      reason: reason,
      raw_log_line: line,
      log_type: 'zscaler',
      line_number: lineNumber + 1
    };
  }

  /**
   * Parse Apache Access Logs
   */
  parseApacheLog(line, lineNumber) {
    // Apache format: IP - - [timestamp] "method path protocol" status size
    const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\d+)/;
    const match = line.match(regex);
    
    if (!match) return null;

    const [, ip, timestamp, request, status, size] = match;
    const [method, path, protocol] = request.split(' ');

    return {
      timestamp: this.parseTimestamp(timestamp, 'apache'),
      ip_address: ip,
      event_description: `Apache: ${method} ${path} - Status: ${status}`,
      method: method,
      path: path,
      protocol: protocol,
      status_code: parseInt(status),
      response_size: parseInt(size),
      raw_log_line: line,
      log_type: 'apache',
      line_number: lineNumber + 1
    };
  }

  /**
   * Parse Nginx Access Logs
   */
  parseNginxLog(line, lineNumber) {
    // Nginx format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
    const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;
    const match = line.match(regex);
    
    if (!match) return null;

    const [, ip, timestamp, request, status, size, referer, userAgent] = match;
    const [method, path, protocol] = request.split(' ');

    return {
      timestamp: this.parseTimestamp(timestamp, 'nginx'),
      ip_address: ip,
      event_description: `Nginx: ${method} ${path} - Status: ${status}`,
      method: method,
      path: path,
      protocol: protocol,
      status_code: parseInt(status),
      response_size: parseInt(size),
      referer: referer,
      user_agent: userAgent,
      raw_log_line: line,
      log_type: 'nginx',
      line_number: lineNumber + 1
    };
  }

  /**
   * Parse Windows Event Logs
   */
  parseWindowsLog(line, lineNumber) {
    // Windows Event Log format detection
    if (line.includes('Event ID:')) {
      const eventIdMatch = line.match(/Event ID:\s*(\d+)/);
      const sourceMatch = line.match(/Source:\s*([^\s]+)/);
      const timeMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M)/);
      
      const eventId = eventIdMatch ? eventIdMatch[1] : '';
      const source = sourceMatch ? sourceMatch[1] : '';
      const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

      return {
        timestamp: this.parseTimestamp(timestamp, 'windows'),
        ip_address: 'localhost', // Windows logs typically don't have IP
        event_description: `Windows Event: ${source} - Event ID: ${eventId}`,
        event_id: eventId,
        source: source,
        raw_log_line: line,
        log_type: 'windows',
        line_number: lineNumber + 1
      };
    }

    return null;
  }

  /**
   * Parse Linux System Logs
   */
  parseLinuxLog(line, lineNumber) {
    // Linux syslog format: timestamp hostname service: message
    const regex = /^([A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+([^:]+):\s*(.*)/;
    const match = line.match(regex);
    
    if (!match) return null;

    const [, timestamp, hostname, service, message] = match;

    return {
      timestamp: this.parseTimestamp(timestamp, 'linux'),
      ip_address: hostname,
      event_description: `Linux: ${service} - ${message}`,
      hostname: hostname,
      service: service,
      message: message,
      raw_log_line: line,
      log_type: 'linux',
      line_number: lineNumber + 1
    };
  }

  /**
   * Parse Generic Logs (fallback)
   */
  parseGenericLog(line, lineNumber) {
    // Try to extract IP and timestamp from generic format
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const timestampRegex = /\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/;
    
    const ipMatch = line.match(ipRegex);
    const timestampMatch = line.match(timestampRegex);
    
    const ip = ipMatch ? ipMatch[0] : 'unknown';
    const timestamp = timestampMatch ? timestampMatch[0] : new Date().toISOString();

    return {
      timestamp: this.parseTimestamp(timestamp),
      ip_address: ip,
      event_description: `Generic Log: ${line.substring(0, 100)}...`,
      raw_log_line: line,
      log_type: 'generic',
      line_number: lineNumber + 1
    };
  }

  /**
   * Parse timestamp in various formats
   */
  parseTimestamp(timestamp, format = 'iso') {
    try {
      if (format === 'apache' || format === 'nginx') {
        // Apache/Nginx format: 25/Dec/2023:10:30:45 +0000
        const date = new Date(timestamp.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6'));
        return date.toISOString();
      } else if (format === 'linux') {
        // Linux format: Dec 25 10:30:45
        const currentYear = new Date().getFullYear();
        const date = new Date(`${timestamp} ${currentYear}`);
        return date.toISOString();
      } else if (format === 'windows') {
        // Windows format: 12/25/2023 10:30:45 AM
        const date = new Date(timestamp);
        return date.toISOString();
      } else {
        // ISO format or other
        return new Date(timestamp).toISOString();
      }
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(entries) {
    const summary = {
      total_entries: entries.length,
      unique_ips: new Set(entries.map(e => e.ip_address)).size,
      time_range: {
        start: null,
        end: null
      },
      log_types: {},
      status_codes: {},
      top_ips: {},
      top_events: {}
    };

    // Calculate time range
    const timestamps = entries.map(e => new Date(e.timestamp)).sort();
    if (timestamps.length > 0) {
      summary.time_range.start = timestamps[0].toISOString();
      summary.time_range.end = timestamps[timestamps.length - 1].toISOString();
    }

    // Count log types
    entries.forEach(entry => {
      summary.log_types[entry.log_type] = (summary.log_types[entry.log_type] || 0) + 1;
    });

    // Count status codes (for web logs)
    entries.forEach(entry => {
      if (entry.status_code) {
        summary.status_codes[entry.status_code] = (summary.status_codes[entry.status_code] || 0) + 1;
      }
    });

    // Count top IPs
    entries.forEach(entry => {
      if (entry.ip_address && entry.ip_address !== 'unknown') {
        summary.top_ips[entry.ip_address] = (summary.top_ips[entry.ip_address] || 0) + 1;
      }
    });

    // Count top events
    entries.forEach(entry => {
      const eventKey = entry.event_description.substring(0, 50);
      summary.top_events[eventKey] = (summary.top_events[eventKey] || 0) + 1;
    });

    return summary;
  }
}

module.exports = LogParser; 