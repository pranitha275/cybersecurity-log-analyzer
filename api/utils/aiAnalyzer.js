export class AIAnalyzer {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
  }

  /**
   * Main analysis function that uses multiple approaches
   */
  async analyzeLogs(logEntry) {
    try {
      // Try OpenAI first if available
      if (this.openaiApiKey) {
        try {
          return await this.analyzeWithOpenAI(logEntry);
        } catch (error) {
          console.warn('OpenAI analysis failed, falling back to HuggingFace:', error.message);
        }
      }

      // Try HuggingFace if available
      if (this.huggingfaceApiKey) {
        try {
          return await this.analyzeWithHuggingFace(logEntry);
        } catch (error) {
          console.warn('HuggingFace analysis failed, falling back to rule-based:', error.message);
        }
      }

      // Fallback to rule-based analysis
      return this.analyzeWithRules(logEntry);

    } catch (error) {
      console.error('AI analysis error:', error);
      return this.analyzeWithRules(logEntry);
    }
  }

  /**
   * Analyze using OpenAI GPT-4o Mini
   */
  async analyzeWithOpenAI(logEntry) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this cybersecurity log entry and provide:
1. Status: "normal", "suspicious", or "anomaly"
2. Confidence score: 0.0 to 1.0
3. Explanation: Brief reason for the classification
4. Threat level: "low", "medium", "high", or "critical"
5. Recommended action: What should be done

Log entry: ${logEntry.event_description}
IP: ${logEntry.ip_address}
Timestamp: ${logEntry.timestamp}

Respond in JSON format:
{
  "status": "suspicious",
  "confidence_score": 0.85,
  "explanation": "Unusual access pattern detected",
  "threat_level": "medium",
  "recommended_action": "Monitor this IP address for further suspicious activity"
}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Try to parse JSON response
      try {
        const analysis = JSON.parse(content);
        return {
          status: analysis.status || 'normal',
          confidence_score: analysis.confidence_score || 0.5,
          explanation: analysis.explanation || 'AI analysis completed',
          threat_level: analysis.threat_level || 'low',
          recommended_action: analysis.recommended_action || 'Continue monitoring'
        };
      } catch (parseError) {
        // If JSON parsing fails, extract information from text
        return this.extractInfoFromText(content);
      }

    } catch (error) {
      throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze using HuggingFace models
   */
  async analyzeWithHuggingFace(logEntry) {
    if (!this.huggingfaceApiKey) {
      throw new Error('HuggingFace API key not configured');
    }

    // Use a zero-shot classification model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        headers: { Authorization: `Bearer ${this.huggingfaceApiKey}` },
        method: 'POST',
        body: JSON.stringify({
          inputs: logEntry.event_description,
          parameters: {
            candidate_labels: ['normal', 'suspicious', 'anomaly'],
            hypothesis_template: 'This log entry indicates {} activity.'
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json();
    const status = data.labels[0] || 'normal';
    const confidence = data.scores[0] || 0.5;

    return {
      status,
      confidence_score: confidence,
      explanation: `HuggingFace classification: ${status} with ${(confidence * 100).toFixed(1)}% confidence`,
      threat_level: this.mapStatusToThreatLevel(status),
      recommended_action: this.getRecommendedAction(status)
    };
  }

  /**
   * Rule-based analysis fallback
   */
  analyzeWithRules(logEntry) {
    const { event_description, ip_address } = logEntry;
    
    let status = 'normal';
    let confidence = 0.6;
    let explanation = 'Rule-based analysis completed';
    let threat_level = 'low';

    // Check for suspicious patterns
    if (event_description.toLowerCase().includes('deny') || 
        event_description.toLowerCase().includes('block') ||
        event_description.toLowerCase().includes('failed')) {
      status = 'suspicious';
      confidence = 0.7;
      explanation = 'Access denied or blocked activity detected';
      threat_level = 'medium';
    }

    // Check for anomaly patterns
    if (event_description.toLowerCase().includes('error') ||
        event_description.toLowerCase().includes('exception') ||
        event_description.toLowerCase().includes('invalid')) {
      status = 'anomaly';
      confidence = 0.8;
      explanation = 'Error or exception detected in log entry';
      threat_level = 'high';
    }

    // Check for known malicious IPs (example)
    const suspiciousIPs = ['192.168.1.100', '10.0.0.50']; // Add your known suspicious IPs
    if (suspiciousIPs.includes(ip_address)) {
      status = 'anomaly';
      confidence = 0.9;
      explanation = 'IP address matches known suspicious patterns';
      threat_level = 'critical';
    }

    return {
      status,
      confidence_score: confidence,
      explanation,
      threat_level,
      recommended_action: this.getRecommendedAction(status)
    };
  }

  /**
   * Extract information from AI text response
   */
  extractInfoFromText(text) {
    const lowerText = text.toLowerCase();
    
    let status = 'normal';
    if (lowerText.includes('suspicious')) status = 'suspicious';
    else if (lowerText.includes('anomaly')) status = 'anomaly';

    let threat_level = 'low';
    if (lowerText.includes('critical')) threat_level = 'critical';
    else if (lowerText.includes('high')) threat_level = 'high';
    else if (lowerText.includes('medium')) threat_level = 'medium';

    return {
      status,
      confidence_score: 0.7,
      explanation: text.substring(0, 200),
      threat_level,
      recommended_action: this.getRecommendedAction(status)
    };
  }

  /**
   * Map status to threat level
   */
  mapStatusToThreatLevel(status) {
    const mapping = {
      'normal': 'low',
      'suspicious': 'medium',
      'anomaly': 'high'
    };
    return mapping[status] || 'low';
  }

  /**
   * Get recommended action based on status
   */
  getRecommendedAction(status) {
    const actions = {
      'normal': 'Continue monitoring',
      'suspicious': 'Investigate further and monitor closely',
      'anomaly': 'Immediate investigation required'
    };
    return actions[status] || 'Continue monitoring';
  }
}

export const analyzeLogs = async (logEntry) => {
  const analyzer = new AIAnalyzer();
  return await analyzer.analyzeLogs(logEntry);
}; 