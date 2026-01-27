/**
 * DocumentUpload - Upload documents for workflow context
 *
 * Allows users to upload text documents (md, txt) that will
 * be used as context by the LLM during the workflow.
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/i18n/useI18n';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  sessionId: string;
  projectPath: string;
  onUploadSuccess?: (filename: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  sessionId,
  projectPath,
  onUploadSuccess,
  onUploadError,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      // Validate file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['md', 'txt', 'markdown'].includes(ext || '')) {
        throw new Error(t('workflow.documentUpload.invalidFormat'));
      }

      // Validate file size (max 500KB for text)
      if (file.size > 500 * 1024) {
        throw new Error(t('workflow.documentUpload.tooLarge'));
      }

      // Read file content
      const content = await file.text();

      // Upload to backend
      const response = await fetch(
        `/api/workflows/session/${sessionId}/document?project_path=${encodeURIComponent(projectPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            filename: file.name,
            format: ext === 'md' || ext === 'markdown' ? 'md' : 'txt',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setUploadedFiles((prev) => [...prev, file.name]);
        onUploadSuccess?.(file.name);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      onUploadError?.(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearDocuments = async () => {
    try {
      const response = await fetch(
        `/api/workflows/session/${sessionId}/document?project_path=${encodeURIComponent(projectPath)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setUploadedFiles([]);
      }
    } catch {
      // Ignore errors on clear
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Uploaded files */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {uploadedFiles.map((filename, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
              >
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm flex-1 truncate">{filename}</span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
            ))}
            <button
              onClick={handleClearDocuments}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('workflow.documentUpload.clearAll')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {t('workflow.documentUpload.uploading')}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('workflow.documentUpload.dropHere')}
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <X className="w-4 h-4" />
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default DocumentUpload;
