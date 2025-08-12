"use client";

import React from 'react';
import { LogEntry } from '@/lib/api';

interface LogAnalyticsChartsProps {
  logEntries: LogEntry[];
  title: string;
}

// Simple Progress Bar Component
const ProgressBar = ({ label, value, total, color }: { 
  label: string; 
  value: number; 
  total: number; 
  color: string; 
}) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-600 dark:text-gray-400">{value} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Simple Bar Chart Component
const BarChart = ({ data, title }: { 
  data: Array<{ label: string; value: number; color: string }>; 
  title: string; 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 dark:text-gray-400 truncate">
              {item.label}
            </div>
            <div className="flex-1 mx-3">
              <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${item.color}`}
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="w-12 text-sm text-gray-900 dark:text-gray-100 text-right">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LogAnalyticsCharts({ logEntries, title }: LogAnalyticsChartsProps) {
  // Process data for visualizations
  const analyticsData = React.useMemo(() => {
    // Threat Level Distribution
    const threatLevels = logEntries.reduce((acc, entry) => {
      const level = entry.threat_level || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status Distribution
    const statuses = logEntries.reduce((acc, entry) => {
      const status = entry.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // IP Activity
    const ipActivity = logEntries.reduce((acc, entry) => {
      const ip = entry.ip_address || 'unknown';
      if (!acc[ip]) {
        acc[ip] = { normal: 0, suspicious: 0, anomaly: 0, total: 0 };
      }
      acc[ip][entry.status as keyof Omit<typeof acc[typeof ip], 'total'>] += 1;
      acc[ip].total += 1;
      return acc;
    }, {} as Record<string, { normal: number; suspicious: number; anomaly: number; total: number }>);

    // Get top 10 IPs
    const topIPs = Object.entries(ipActivity)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10);

    // Confidence Score Distribution
    const confidenceRanges = logEntries.reduce((acc, entry) => {
      if (entry.confidence_score !== null && entry.confidence_score !== undefined) {
        const score = entry.confidence_score * 100;
        if (score >= 90) acc['90-100%'] += 1;
        else if (score >= 80) acc['80-89%'] += 1;
        else if (score >= 70) acc['70-79%'] += 1;
        else if (score >= 60) acc['60-69%'] += 1;
        else acc['< 60%'] += 1;
      }
      return acc;
    }, { '90-100%': 0, '80-89%': 0, '70-79%': 0, '60-69%': 0, '< 60%': 0 });

    return { threatLevels, statuses, topIPs, confidenceRanges };
  }, [logEntries]);

  if (logEntries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-lg font-medium">No data available for visualization</p>
        <p className="text-sm">Upload log files to see charts and analytics</p>
      </div>
    );
  }

  const total = logEntries.length;

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📊 {title} Analytics
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing insights from {logEntries.length} log entries
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-blue-100">Total Entries</div>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">
            {analyticsData.statuses.anomaly || 0}
          </div>
          <div className="text-red-100">Anomalies</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">
            {analyticsData.statuses.suspicious || 0}
          </div>
          <div className="text-yellow-100">Suspicious</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Level Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            🎯 Threat Level Distribution
          </h3>
          <div className="space-y-3">
            <ProgressBar 
              label="🟢 Low" 
              value={analyticsData.threatLevels.low || 0} 
              total={total} 
              color="bg-green-500" 
            />
            <ProgressBar 
              label="🟡 Medium" 
              value={analyticsData.threatLevels.medium || 0} 
              total={total} 
              color="bg-yellow-500" 
            />
            <ProgressBar 
              label="🟠 High" 
              value={analyticsData.threatLevels.high || 0} 
              total={total} 
              color="bg-orange-500" 
            />
            <ProgressBar 
              label="🔴 Critical" 
              value={analyticsData.threatLevels.critical || 0} 
              total={total} 
              color="bg-red-500" 
            />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            📋 Status Distribution
          </h3>
          <div className="space-y-3">
            <ProgressBar 
              label="✅ Normal" 
              value={analyticsData.statuses.normal || 0} 
              total={total} 
              color="bg-green-500" 
            />
            <ProgressBar 
              label="⚠️ Suspicious" 
              value={analyticsData.statuses.suspicious || 0} 
              total={total} 
              color="bg-yellow-500" 
            />
            <ProgressBar 
              label="🚨 Anomaly" 
              value={analyticsData.statuses.anomaly || 0} 
              total={total} 
              color="bg-red-500" 
            />
          </div>
        </div>

        {/* Confidence Score Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            📈 Confidence Score Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(analyticsData.confidenceRanges).map(([range, count]) => (
              <ProgressBar 
                key={range}
                label={range} 
                value={count} 
                total={total} 
                color={
                  range === '90-100%' ? 'bg-green-500' :
                  range === '80-89%' ? 'bg-blue-500' :
                  range === '70-79%' ? 'bg-yellow-500' :
                  range === '60-69%' ? 'bg-orange-500' : 'bg-red-500'
                }
              />
            ))}
          </div>
        </div>

        {/* Top IP Addresses */}
        <BarChart 
          title="🌐 Top IP Addresses"
          data={analyticsData.topIPs.map(([ip, data]) => ({
            label: ip,
            value: data.total,
            color: data.anomaly > 0 ? 'bg-red-500' : 
                   data.suspicious > 0 ? 'bg-yellow-500' : 'bg-green-500'
          }))}
        />
      </div>

      {/* Timeline Overview */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          ⏰ Activity Timeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Time Range</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {logEntries.length > 0 && (
                <>
                  <div>📅 Earliest: {new Date(Math.min(...logEntries.map(e => new Date(e.timestamp).getTime()))).toLocaleString()}</div>
                  <div>📅 Latest: {new Date(Math.max(...logEntries.map(e => new Date(e.timestamp).getTime()))).toLocaleString()}</div>
                </>
              )}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Unique IPs</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {analyticsData.topIPs.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              IP addresses detected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}