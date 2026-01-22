/**
 * DocumentPreview - Live preview of document being generated
 * 
 * Features:
 * - Split view with workflow chat
 * - Real-time content updates
 * - Section highlighting
 * - Export options
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'active' | 'complete';
}

interface DocumentPreviewProps {
  title: string;
  content: string;
  sections?: DocumentSection[];
  isGenerating?: boolean;
  onExport?: (format: 'md' | 'pdf' | 'docx') => void;
  className?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  title,
  content,
  sections = [],
  isGenerating = false,
  onExport,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
  // Parse content into sections if not provided
  const displaySections = sections.length > 0 ? sections : parseMarkdownSections(content);
  
  return (
    <motion.div
      layout
      className={`
        flex flex-col bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-xl overflow-hidden
        ${isExpanded ? 'fixed inset-4 z-50' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {title || 'Document Preview'}
          </h3>
          {isGenerating && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
              Generating...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {/* Export dropdown */}
          {onExport && (
            <div className="relative group">
              <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4 text-gray-500" />
              </button>
              <div className="absolute right-0 mt-1 py-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => onExport('md')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Markdown (.md)
                </button>
                <button
                  onClick={() => onExport('pdf')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  PDF
                </button>
                <button
                  onClick={() => onExport('docx')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Word (.docx)
                </button>
              </div>
            </div>
          )}
          
          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-500" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {displaySections.length > 0 ? (
          <div className="space-y-4">
            {displaySections.map((section) => (
              <DocumentSectionView
                key={section.id}
                section={section}
                isCollapsed={collapsedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            {content ? (
              <pre className="whitespace-pre-wrap font-sans">{content}</pre>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                Document content will appear here as you progress through the workflow.
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Progress footer */}
      {displaySections.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {displaySections.filter(s => s.status === 'complete').length} / {displaySections.length} sections
            </span>
            <div className="flex gap-1">
              {displaySections.map(section => (
                <div
                  key={section.id}
                  className={`w-2 h-2 rounded-full ${
                    section.status === 'complete' ? 'bg-green-500' :
                    section.status === 'active' ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-300 dark:bg-gray-600'
                  }`}
                  title={section.title}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// === Section View ===

interface DocumentSectionViewProps {
  section: DocumentSection;
  isCollapsed: boolean;
  onToggle: () => void;
}

const DocumentSectionView: React.FC<DocumentSectionViewProps> = ({
  section,
  isCollapsed,
  onToggle,
}) => {
  const statusColors = {
    pending: 'border-gray-200 dark:border-gray-700',
    active: 'border-yellow-400 dark:border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
    complete: 'border-green-400 dark:border-green-500',
  };
  
  return (
    <div className={`border-l-2 pl-4 ${statusColors[section.status]}`}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-2 text-left group"
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {section.title}
          </h4>
          {section.status === 'active' && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
              In progress
            </span>
          )}
          {section.status === 'complete' && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        )}
      </button>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="prose dark:prose-invert prose-sm max-w-none pb-4">
              {section.content ? (
                <div className="whitespace-pre-wrap">{section.content}</div>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  Content will appear here...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// === Helper: Parse markdown into sections ===

function parseMarkdownSections(content: string): DocumentSection[] {
  if (!content) return [];
  
  const sections: DocumentSection[] = [];
  const lines = content.split('\n');
  let currentSection: DocumentSection | null = null;
  let contentLines: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }
      
      // Start new section
      const title = line.substring(3).trim();
      currentSection = {
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        content: '',
        status: 'pending',
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }
  
  // Determine status based on content
  let foundEmpty = false;
  for (const section of sections) {
    if (!section.content || section.content.includes('_Not') || section.content.includes('TBD')) {
      if (!foundEmpty) {
        section.status = 'active';
        foundEmpty = true;
      } else {
        section.status = 'pending';
      }
    } else {
      section.status = 'complete';
    }
  }
  
  return sections;
}

export default DocumentPreview;
