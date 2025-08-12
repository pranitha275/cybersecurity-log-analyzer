const axios = require('axios');

class AIAnalyzer {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.useOpenAI = !!this.openaiApiKey;
    this.useHuggingFace = !!this.huggingfaceApiKey;
  }

  /**
   * Analyze a single log entry for anomalies
   */
  async analyzeLogEntry(entry, context = []) {
    try {
      if (this.useOpenAI) {
        return await this.analyzeWithOpenAI(entry, context);
      } else if (this.useHuggingFace) {
        return await this.analyzeWithHuggingFace(entry, context);
      } else {
        return await this.analyzeWithRules(entry, context);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      return await this.analyzeWithRules(entry, context);
    }
  }

  /**
   * Analyze using OpenAI GPT-4o Mini
   */
  async analyzeWithOpenAI(entry, context) {
    const prompt = this.buildAnalysisPrompt(entry, context);
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a cybersecurity expert analyzing log entries for potential threats and anomalies. 
          Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
          {
            "status": "normal|anomaly|suspicious",
            "confidence_score": 0.0-1.0,
            "explanation": "Brief explanation of the analysis",
            "threat_level": "low|medium|high|critical",
            "recommended_action": "What action should be taken"
          }`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const analysis = response.data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(analysis);
      return {
        status: parsed.status || 'normal',
        confidence_score: parsed.confidence_score || 0.5,
        explanation: parsed.explanation || 'AI analysis completed',
        threat_level: parsed.threat_level || 'low',
        recommended_action: parsed.recommended_action || 'Monitor'
      };
    } catch (error) {
      console.log('Failed to parse AI response as JSON, using fallback parser');
      return this.parseAIResponse(analysis);
    }
  }

  /**
   * Analyze using Hugging Face models
   */
  async analyzeWithHuggingFace(entry, context) {
    // Use Hugging Face for text classification
    const text = `${entry.event_description} ${entry.ip_address} ${entry.raw_log_line}`;
    
    try {
      const response = await axios.post('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
        inputs: text,
        parameters: {
          candidate_labels: ['normal', 'suspicious', 'malicious', 'error']
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.huggingfaceApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      const label = result.labels[0];
      const score = result.scores[0];

      return {
        status: this.mapHuggingFaceLabel(label),
        confidence_score: score,
        explanation: `Classified as ${label} with ${(score * 100).toFixed(1)}% confidence`,
        threat_level: this.getThreatLevel(label, score),
        recommended_action: this.getRecommendedAction(label)
      };
    } catch (error) {
      return await this.analyzeWithRules(entry, context);
    }
  }

  /**
   * Rule-based analysis (fallback)
   */
  async analyzeWithRules(entry, context) {
    const analysis = {
      status: 'normal',
      confidence_score: 0.5,
      explanation: 'Rule-based analysis: No suspicious patterns detected',
      threat_level: 'low',
      recommended_action: 'Monitor'
    };

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /failed login|authentication failed/i, weight: 0.3 },
      { pattern: /block|deny|drop/i, weight: 0.4 },
      { pattern: /malware|virus|trojan/i, weight: 0.8 },
      { pattern: /admin|root|privileged/i, weight: 0.3 },
      { pattern: /sql injection|xss|csrf/i, weight: 0.9 },
      { pattern: /port scan|brute force/i, weight: 0.7 },
      { pattern: /suspicious|anomalous/i, weight: 0.6 }
    ];

    let totalScore = 0;
    let matchedPatterns = [];

    for (const pattern of suspiciousPatterns) {
      if (pattern.pattern.test(entry.event_description) || 
          pattern.pattern.test(entry.raw_log_line)) {
        totalScore += pattern.weight;
        matchedPatterns.push(pattern.pattern.source);
      }
    }

    // Check for repeated events from same IP
    const sameIPEvents = context.filter(e => e.ip_address === entry.ip_address);
    if (sameIPEvents.length > 5) {
      totalScore += 0.3;
      matchedPatterns.push('repeated_events');
    }

    // Check for known malicious IPs (simplified)
    const maliciousIPs = ['203.0.113.45', '192.0.2.1']; // Example IPs
    if (maliciousIPs.includes(entry.ip_address)) {
      totalScore += 0.8;
      matchedPatterns.push('known_malicious_ip');
    }

    // Determine status based on score
    if (totalScore > 0.7) {
      analysis.status = 'anomaly';
      analysis.confidence_score = Math.min(totalScore, 0.95);
      analysis.threat_level = 'high';
      analysis.recommended_action = 'Investigate immediately';
    } else if (totalScore > 0.4) {
      analysis.status = 'suspicious';
      analysis.confidence_score = totalScore;
      analysis.threat_level = 'medium';
      analysis.recommended_action = 'Monitor closely';
    }

    analysis.explanation = `Rule-based analysis: ${matchedPatterns.length > 0 ? 
      `Detected patterns: ${matchedPatterns.join(', ')}` : 'No suspicious patterns detected'}`;

    return analysis;
  }

  /**
   * Build analysis prompt for OpenAI
   */
  buildAnalysisPrompt(entry, context) {
    const recentEvents = context.slice(-5).map(e => 
      `${e.timestamp}: ${e.ip_address} - ${e.event_description}`
    ).join('\n');

    return `Analyze this cybersecurity log entry for potential threats:

Current Entry:
- Timestamp: ${entry.timestamp}
- IP Address: ${entry.ip_address}
- Event: ${entry.event_description}
- Raw Log: ${entry.raw_log_line}

Recent Context (last 5 events):
${recentEvents}

Consider:
1. Is this event normal or suspicious?
2. Does it indicate a security threat?
3. What's the confidence level?
4. What action should be taken?

Provide analysis in JSON format.`;
  }

  /**
   * Parse AI response when JSON parsing fails
   */
  parseAIResponse(response) {
    const analysis = {
      status: 'normal',
      confidence_score: 0.5,
      explanation: response.substring(0, 200),
      threat_level: 'low',
      recommended_action: 'Monitor'
    };

    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*(\{.*?\})\s*```/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          status: parsed.status || 'normal',
          confidence_score: parsed.confidence_score || 0.5,
          explanation: parsed.explanation || 'AI analysis completed',
          threat_level: parsed.threat_level || 'low',
          recommended_action: parsed.recommended_action || 'Monitor'
        };
      } catch (error) {
        console.log('Failed to parse JSON from markdown block');
      }
    }

    // Try to extract JSON without markdown
    const jsonMatch2 = response.match(/\{.*\}/s);
    if (jsonMatch2) {
      try {
        const parsed = JSON.parse(jsonMatch2[0]);
        return {
          status: parsed.status || 'normal',
          confidence_score: parsed.confidence_score || 0.5,
          explanation: parsed.explanation || 'AI analysis completed',
          threat_level: parsed.threat_level || 'low',
          recommended_action: parsed.recommended_action || 'Monitor'
        };
      } catch (error) {
        console.log('Failed to parse JSON from response');
      }
    }

    // Try to extract status from response
    if (response.toLowerCase().includes('anomaly') || response.toLowerCase().includes('suspicious')) {
      analysis.status = 'anomaly';
      analysis.confidence_score = 0.7;
      analysis.threat_level = 'medium';
    }

    return analysis;
  }

  /**
   * Map Hugging Face labels to status
   */
  mapHuggingFaceLabel(label) {
    const mapping = {
      'normal': 'normal',
      'suspicious': 'suspicious',
      'malicious': 'anomaly',
      'error': 'suspicious'
    };
    return mapping[label] || 'normal';
  }

  /**
   * Get threat level based on label and confidence
   */
  getThreatLevel(label, confidence) {
    if (label === 'malicious' && confidence > 0.7) return 'high';
    if (label === 'suspicious' && confidence > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action
   */
  getRecommendedAction(label) {
    const actions = {
      'normal': 'Continue monitoring',
      'suspicious': 'Monitor closely',
      'malicious': 'Investigate immediately',
      'error': 'Check system logs'
    };
    return actions[label] || 'Monitor';
  }

  /**
   * Batch analyze multiple entries
   */
  async analyzeBatch(entries) {
    const results = [];
    const context = [];

    for (const entry of entries) {
      const analysis = await this.analyzeLogEntry(entry, context);
      results.push({
        ...entry,
        ...analysis
      });
      context.push(entry);
    }

    return results;
  }
}

module.exports = AIAnalyzer; 