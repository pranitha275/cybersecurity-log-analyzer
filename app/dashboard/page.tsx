"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { UploadIcon, SearchIcon, RefreshCwIcon, BrainIcon, AlertTriangleIcon, LoaderIcon, BarChart3Icon, TrashIcon } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { logsAPI, LogFile, LogEntry } from "@/lib/api";
import Link from "next/link";
import LogAnalyticsCharts from "@/components/LogAnalyticsCharts";
import FileSelector from "@/components/FileSelector";
import { authAPI } from "@/lib/api";

export default function DashboardPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [analyzingFiles, setAnalyzingFiles] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedAnalyticsFile, setSelectedAnalyticsFile] = useState<number | 'all'>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Clear all data when user changes (login/logout)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Clear all previous session data
      setFiles([]);
      setLogEntries([]);
      setSelectedFileId(null);
      setAnalyzingFiles(new Set());
      setNotification(null);
      setSelectedAnalyticsFile('all');
      setShowAnalytics(false);
      
      // Load fresh data for the current user
      loadFiles();
    } else if (!isAuthenticated) {
      // Clear all data when not authenticated
      setFiles([]);
      setLogEntries([]);
      setSelectedFileId(null);
      setAnalyzingFiles(new Set());
      setNotification(null);
      setSelectedAnalyticsFile('all');
      setShowAnalytics(false);
      setSelectedFile(null);
    }
  }, [isAuthenticated, user]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Clear all data when component unmounts
      setFiles([]);
      setLogEntries([]);
      setSelectedFileId(null);
      setAnalyzingFiles(new Set());
      setNotification(null);
      setSelectedAnalyticsFile('all');
      setShowAnalytics(false);
      setSelectedFile(null);
    };
  }, []);

  // Load user's files
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFiles();
    }
  }, [isAuthenticated, user]);

  const loadFiles = async () => {
    try {
      // Only load files if we have a valid authenticated user
      if (!user || !authAPI.isAuthenticated()) {
        console.log('No authenticated user, skipping file load');
        setFiles([]);
        return;
      }

      console.log('Loading files for user:', user.email);
      const response = await logsAPI.getFiles();
      
      // Ensure we only show files for the current user
      if (response.files && Array.isArray(response.files)) {
        setFiles(response.files);
        console.log('Loaded files:', response.files.length);
      } else {
        console.log('No files found or invalid response');
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
      setNotification('Error loading files. Please try again.');
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await logsAPI.uploadFile(selectedFile);
      setSelectedFile(null);
      await loadFiles(); // Reload files
      await loadAllLogEntries(); // Reload log entries
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadFiles();
      await loadAllLogEntries();
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (fileId: number) => {
    try {
      const response = await logsAPI.getAnalysis(fileId);
      setLogEntries(response.entries);
      setSelectedFileId(fileId);
    } catch (error) {
      console.error('Error loading analysis:', error);
    }
  };

  const handleLogout = () => {
    // Clear all dashboard data before logging out
    setFiles([]);
    setLogEntries([]);
    setSelectedFileId(null);
    setAnalyzingFiles(new Set());
    setNotification(null);
    setSelectedAnalyticsFile('all');
    setShowAnalytics(false);
    setSelectedFile(null);
    
    // Then logout
    logout();
    router.push('/login');
  };

  const handleReanalyze = async (fileId: number) => {
    setAnalyzingFiles(prev => new Set(prev.add(fileId)));
    try {
      const result = await logsAPI.reanalyzeFile(fileId);
      console.log('Re-analysis result:', result);
      await loadAllLogEntries(); // Reload data
      setNotification(`Re-analysis completed! Found ${result.anomaliesFound} anomalies.`);
      setTimeout(() => setNotification(null), 5000); // Hide after 5 seconds
    } catch (error) {
      console.error('Error re-analyzing:', error);
      setNotification(`Error during re-analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setNotification(null), 5000); // Hide after 5 seconds
    } finally {
      setAnalyzingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const handleDeleteFile = async (fileId: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This will permanently remove the file and all its analysis data.`)) {
      return;
    }

    try {
      await logsAPI.deleteFile(fileId);
      console.log('File deleted successfully:', fileId);
      
      // Remove the file from the local state
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      // Reload log entries to update the display
      await loadAllLogEntries();
      
      setNotification(`File "${filename}" and all associated analysis data deleted successfully.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error deleting file:', error);
      setNotification(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Load all log entries from all uploaded files
  useEffect(() => {
    if (isAuthenticated && files.length > 0) {
      loadAllLogEntries();
    }
  }, [isAuthenticated, files]);

  const loadAllLogEntries = async () => {
    if (files.length === 0 || !user || !authAPI.isAuthenticated()) {
      setLogEntries([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const allEntries: LogEntry[] = [];
      for (const file of files) {
        try {
          const response = await logsAPI.getAnalysis(file.id);
          if (response.entries && Array.isArray(response.entries)) {
            allEntries.push(...response.entries);
          }
        } catch (error) {
          console.error(`Error loading analysis for file ${file.id}:`, error);
        }
      }
      setLogEntries(allEntries);
      console.log('Loaded log entries:', allEntries.length);
    } catch (error) {
      console.error('Error loading all log entries:', error);
      setLogEntries([]);
      setNotification('Error loading log entries. Please try again.');
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Use real data from database
  const displayLogData = logEntries;

  // Get analytics data based on selected file
  const getAnalyticsData = () => {
    if (selectedAnalyticsFile === 'all') {
      return logEntries;
    } else {
      // Filter entries for specific file
      return logEntries.filter(entry => {
        return entry.log_file_id === selectedAnalyticsFile;
      });
    }
  };

  const getAnalyticsTitle = () => {
    if (selectedAnalyticsFile === 'all') {
      return 'Combined View';
    } else {
      const file = files.find(f => f.id === selectedAnalyticsFile);
      return file ? file.original_filename : 'Unknown File';
    }
  };

return (
  <div className="flex min-h-screen w-full flex-col bg-gray-100 dark:bg-gray-950">
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6 dark:bg-gray-800">
      <Link href="#" className="flex items-center gap-2 font-semibold" prefetch={false}>
        <SearchIcon className="h-6 w-6" />
        <span className="sr-only">Cybersecurity Log Analyzer</span>
        <span>Log Analyzer</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Welcome, {user?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
                        </div>
                </header>
                
                {/* Notification Banner */}
                {notification && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mx-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span>{notification}</span>
                      <button 
                        onClick={() => setNotification(null)}
                        className="text-green-700 hover:text-green-900"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Log Analysis Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant={showAnalytics ? "default" : "outline"}
            size="sm"
          >
            <BarChart3Icon className="h-4 w-4 mr-2" />
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upload Log File</CardTitle>
            <UploadIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input 
                id="log-file" 
                type="file" 
                accept=".txt,.log"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Supported formats: .txt, .log
            </p>
            {selectedFile && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Selected: {selectedFile.name}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Log Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayLogData.length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              From {files.length} uploaded files
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayLogData.filter(entry => entry.status === "anomaly").length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Flagged for review
            </p>
          </CardContent>
        </Card>
                              <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Uploaded Files</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{files.length}</div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Log files uploaded
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
                          <BrainIcon className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {displayLogData.filter(entry => entry.explanation && entry.explanation.includes('AI')).length}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            AI-analyzed entries
                          </p>
                        </CardContent>
                      </Card>
      </div>
      
      {/* Uploaded Files Section */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{file.original_filename}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(file.upload_date).toLocaleString()}
                    </p>
                  </div>
                                                  <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFileSelect(file.id)}
                                  >
                                    View Analysis
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReanalyze(file.id)}
                                    disabled={analyzingFiles.has(file.id)}
                                    className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
                                  >
                                    {analyzingFiles.has(file.id) ? (
                                      <LoaderIcon className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <BrainIcon className="h-3 w-3 mr-1" />
                                    )}
                                    {analyzingFiles.has(file.id) ? 'Analyzing...' : 'AI Re-analyze'}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteFile(file.id, file.original_filename)}
                                    className="bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300"
                                  >
                                    <TrashIcon className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
                          )}

                    {/* Analytics Section */}
                    {showAnalytics && (
                      <Card className="mb-6">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3Icon className="h-5 w-5 text-blue-500" />
                            Data Visualization & Analytics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-6 lg:grid-cols-4">
                            {/* File Selector */}
                            <div className="lg:col-span-1">
                              <FileSelector
                                files={files}
                                selectedFileId={selectedAnalyticsFile}
                                onFileSelect={setSelectedAnalyticsFile}
                              />
                            </div>
                            
                            {/* Charts */}
                            <div className="lg:col-span-3">
                              <LogAnalyticsCharts
                                logEntries={getAnalyticsData()}
                                title={getAnalyticsTitle()}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
        <CardHeader>
          <CardTitle>Log Analysis Results</CardTitle>
          <p className="text-sm text-gray-500">
            {displayLogData.length > 0 
              ? `Showing ${displayLogData.length} log entries from ${files.length} files`
              : 'No log entries found. Upload a file to see results.'
            }
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-500" />
                <p className="text-gray-500">Loading log entries...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Event Description</TableHead>
                  <TableHead>Log Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>AI Analysis</TableHead>
                  <TableHead>Threat Level</TableHead>
                  <TableHead>Raw Log Line</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {displayLogData.map((entry, index) => (
                <TableRow key={index} className={entry.status === "anomaly" ? "bg-red-50 dark:bg-red-950" : ""}>
                  <TableCell>
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{entry.ip_address}</TableCell>
                  <TableCell className="max-w-xs truncate" title={entry.event_description}>
                    {entry.event_description}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {entry.log_type || 'generic'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${entry.status === "anomaly" ? "text-red-600 dark:text-red-400" : entry.status === "suspicious" ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                      {entry.status === "anomaly" ? "Anomaly" : entry.status === "suspicious" ? "Suspicious" : "Normal"}
                    </span>
                  </TableCell>
                                  <TableCell>{entry.confidence_score !== null && entry.confidence_score !== undefined ? `${(entry.confidence_score * 100).toFixed(0)}%` : "N/A"}</TableCell>
                                  <TableCell className="max-w-xs truncate" title={entry.explanation || "N/A"}>
                                    {entry.explanation ? (
                                      <div className="flex items-center gap-1">
                                        {entry.explanation.includes('AI') && <BrainIcon className="h-3 w-3 text-blue-500" />}
                                        {entry.explanation.substring(0, 50)}...
                                      </div>
                                    ) : "N/A"}
                                  </TableCell>
                                                                      <TableCell>
                                    {entry.threat_level ? (
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        entry.threat_level === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                        entry.threat_level === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                        entry.threat_level === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      }`}>
                                        {entry.threat_level.toUpperCase()}
                                      </span>
                                    ) : "N/A"}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate" title={entry.raw_log_line || "N/A"}>
                                    {entry.raw_log_line ? (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {entry.raw_log_line.length > 50 ? 
                                          `${entry.raw_log_line.substring(0, 50)}...` : 
                                          entry.raw_log_line
                                        }
                                      </div>
                                    ) : "N/A"}
                                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </main>
  </div>
);
}
