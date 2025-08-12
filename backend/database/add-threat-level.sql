-- Add threat_level and recommended_action columns to log_entries table
ALTER TABLE log_entries 
ADD COLUMN IF NOT EXISTS threat_level VARCHAR(20) DEFAULT 'low',
ADD COLUMN IF NOT EXISTS recommended_action VARCHAR(255) DEFAULT 'Monitor';

-- Create index for threat_level for better performance
CREATE INDEX IF NOT EXISTS idx_log_entries_threat_level ON log_entries(threat_level);