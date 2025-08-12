"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogFile } from '@/lib/api';
import { BarChart3Icon, FileTextIcon, LayersIcon } from 'lucide-react';

interface FileSelectorProps {
  files: LogFile[];
  selectedFileId: number | 'all';
  onFileSelect: (fileId: number | 'all') => void;
  className?: string;
}

export default function FileSelector({ 
  files, 
  selectedFileId, 
  onFileSelect, 
  className = "" 
}: FileSelectorProps) {
  const getFileIcon = (filename: string) => {
    if (filename.includes('apache')) return '🌐';
    if (filename.includes('nginx')) return '⚡';
    if (filename.includes('zscaler')) return '🛡️';
    if (filename.includes('linux')) return '🐧';
    if (filename.includes('windows')) return '🪟';
    return '📄';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalEntries = () => {
    return files.reduce((total, file) => total + (file.entries_count || 0), 0);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <BarChart3Icon className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Analytics View
        </h3>
      </div>
      
      <Select value={selectedFileId.toString()} onValueChange={(value) => 
        onFileSelect(value === 'all' ? 'all' : parseInt(value))
      }>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* Combined view option */}
          <SelectItem value="all">
            <div className="flex items-center gap-3 py-1">
              <LayersIcon className="h-4 w-4 text-purple-500" />
              <div className="flex flex-col">
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  📊 Combined View - All Files
                </span>
                <span className="text-xs text-gray-500">
                  {files.length} files • {getTotalEntries()} total entries
                </span>
              </div>
            </div>
          </SelectItem>
          
          {/* Individual file options */}
          {files.map((file) => (
            <SelectItem key={file.id} value={file.id.toString()}>
              <div className="flex items-center gap-3 py-1">
                <FileTextIcon className="h-4 w-4 text-blue-500" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    {getFileIcon(file.original_filename)} {file.original_filename}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)} • uploaded {formatDate(file.upload_date)}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Summary info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedFileId === 'all' ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Files:</span>
                <span className="font-medium">{files.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Combined Entries:</span>
                <span className="font-medium">{getTotalEntries()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Size:</span>
                <span className="font-medium">
                  {formatFileSize(files.reduce((total, file) => total + file.file_size, 0))}
                </span>
              </div>
            </div>
          ) : (
            (() => {
              const selectedFile = files.find(f => f.id === selectedFileId);
              if (!selectedFile) return null;
              return (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>File:</span>
                    <span className="font-medium">{selectedFile.original_filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{formatFileSize(selectedFile.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span className="font-medium">{formatDate(selectedFile.upload_date)}</span>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}