/**
 * VisualDocuments - React components for visual document types
 * 
 * Renders JSON-based documents:
 * - Mind Maps (tree structure)
 * - Mood Boards (image/color grids)
 * - Timelines (milestone visualization)
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Tag,
  Calendar,
  Check,
  Clock,
  Target,
} from 'lucide-react';

// === Types ===

export interface MindMapNode {
  id: string;
  label: string;
  color?: string;
  children?: MindMapNode[];
}

export interface MindMapData {
  type: 'mindmap';
  version: string;
  title: string;
  root: MindMapNode;
}

export interface MoodBoardItem {
  id: string;
  type: 'color' | 'image' | 'tag' | 'text';
  value: string;
  caption?: string;
}

export interface MoodBoardSection {
  id: string;
  label: string;
  items: MoodBoardItem[];
}

export interface MoodBoardData {
  type: 'moodboard';
  version: string;
  title: string;
  sections: MoodBoardSection[];
}

export interface TimelineMilestone {
  id: string;
  date: string;
  title: string;
  description?: string;
  status: 'done' | 'current' | 'upcoming';
}

export interface TimelineData {
  type: 'timeline';
  version: string;
  title: string;
  milestones: TimelineMilestone[];
}

// === Mind Map Component ===

interface MindMapProps {
  data: MindMapData;
  className?: string;
}

export const MindMap: React.FC<MindMapProps> = ({ data, className = '' }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);
  
  const expandAll = () => {
    const getAllIds = (node: MindMapNode): string[] => {
      const ids = [node.id];
      node.children?.forEach(child => ids.push(...getAllIds(child)));
      return ids;
    };
    setExpandedNodes(new Set(getAllIds(data.root)));
  };
  
  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };
  
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {data.title}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Expand all"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Collapse all"
          >
            <Minus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      
      {/* Tree */}
      <div className="p-4">
        <MindMapNodeView
          node={data.root}
          level={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
        />
      </div>
    </div>
  );
};

interface MindMapNodeViewProps {
  node: MindMapNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}

const MindMapNodeView: React.FC<MindMapNodeViewProps> = ({
  node,
  level,
  expandedNodes,
  onToggle,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  
  // Color palette for levels
  const levelColors = [
    'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
  ];
  
  const nodeColor = node.color || levelColors[level % levelColors.length];
  
  return (
    <div className="relative">
      {/* Connection line */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-4 h-4 border-l-2 border-b-2 border-gray-300 dark:border-gray-600 rounded-bl" 
          style={{ marginLeft: '-1rem', marginTop: '-0.5rem' }}
        />
      )}
      
      {/* Node */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
          ${nodeColor}
          ${hasChildren ? 'cursor-pointer' : ''}
        `}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {hasChildren && (
          <span className="text-gray-500">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        )}
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {node.label}
        </span>
      </motion.div>
      
      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4"
          >
            {node.children!.map(child => (
              <MindMapNodeView
                key={child.id}
                node={child}
                level={level + 1}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// === Mood Board Component ===

interface MoodBoardProps {
  data: MoodBoardData;
  className?: string;
}

export const MoodBoard: React.FC<MoodBoardProps> = ({ data, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {data.title}
        </h3>
      </div>
      
      {/* Sections */}
      <div className="p-4 space-y-6">
        {data.sections.map(section => (
          <MoodBoardSectionView key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
};

interface MoodBoardSectionViewProps {
  section: MoodBoardSection;
}

const MoodBoardSectionView: React.FC<MoodBoardSectionViewProps> = ({ section }) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {section.label}
      </h4>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {section.items.map(item => (
          <MoodBoardItemView key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

interface MoodBoardItemViewProps {
  item: MoodBoardItem;
}

const MoodBoardItemView: React.FC<MoodBoardItemViewProps> = ({ item }) => {
  
  if (item.type === 'color') {
    return (
      <div className="relative group">
        <div
          className="aspect-square rounded-lg shadow-sm cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: item.value }}
          title={item.caption || item.value}
        />
        {item.caption && (
          <div className="absolute inset-x-0 bottom-0 p-1 bg-black/50 text-white text-xs text-center rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {item.caption}
          </div>
        )}
      </div>
    );
  }
  
  if (item.type === 'image') {
    return (
      <div className="relative group">
        <img
          src={item.value}
          alt={item.caption || 'Mood board image'}
          className="aspect-square object-cover rounded-lg shadow-sm cursor-pointer hover:scale-105 transition-transform"
        />
        {item.caption && (
          <div className="absolute inset-x-0 bottom-0 p-1 bg-black/50 text-white text-xs text-center rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {item.caption}
          </div>
        )}
      </div>
    );
  }
  
  if (item.type === 'tag') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
        <Tag className="w-3 h-3 text-gray-500" />
        <span className="text-gray-700 dark:text-gray-300">{item.value}</span>
      </div>
    );
  }
  
  // Text type
  return (
    <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
        "{item.value}"
      </p>
      {item.caption && (
        <p className="mt-1 text-xs text-gray-500">— {item.caption}</p>
      )}
    </div>
  );
};

// === Timeline Component ===

interface TimelineProps {
  data: TimelineData;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ data, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {data.title}
        </h3>
      </div>
      
      {/* Timeline */}
      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
          
          {/* Milestones */}
          <div className="space-y-6">
            {data.milestones.map((milestone) => (
              <TimelineMilestoneView
                key={milestone.id}
                milestone={milestone}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TimelineMilestoneViewProps {
  milestone: TimelineMilestone;
}

const TimelineMilestoneView: React.FC<TimelineMilestoneViewProps> = ({
  milestone,
}) => {
  const statusStyles = {
    done: {
      dot: 'bg-green-500',
      icon: Check,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
    },
    current: {
      dot: 'bg-yellow-500 animate-pulse',
      icon: Target,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    upcoming: {
      dot: 'bg-gray-300 dark:bg-gray-600',
      icon: Clock,
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
    },
  };
  
  const style = statusStyles[milestone.status];
  const Icon = style.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex gap-4"
    >
      {/* Dot */}
      <div className="relative z-10">
        <div className={`w-8 h-8 rounded-full ${style.dot} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      
      {/* Content */}
      <div className={`flex-1 p-4 rounded-lg border ${style.bg} ${style.border}`}>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {milestone.date}
          </span>
        </div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          {milestone.title}
        </h4>
        {milestone.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {milestone.description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// === Document Renderer (auto-detects type) ===

interface VisualDocumentProps {
  data: MindMapData | MoodBoardData | TimelineData;
  className?: string;
}

export const VisualDocument: React.FC<VisualDocumentProps> = ({ data, className }) => {
  switch (data.type) {
    case 'mindmap':
      return <MindMap data={data as MindMapData} className={className} />;
    case 'moodboard':
      return <MoodBoard data={data as MoodBoardData} className={className} />;
    case 'timeline':
      return <Timeline data={data as TimelineData} className={className} />;
    default:
      return (
        <div className={`p-4 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
          <p className="text-gray-500">Unknown document type</p>
        </div>
      );
  }
};

export default VisualDocument;
