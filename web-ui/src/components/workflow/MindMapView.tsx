/**
 * MindMapView - Interactive mind map visualization
 * 
 * Renders JSON mind map data as an interactive tree.
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';

interface MindMapNode {
  id: string;
  label: string;
  color?: string;
  children?: MindMapNode[];
}

interface MindMapData {
  type: 'mindmap';
  version: string;
  title: string;
  generated: string;
  root: MindMapNode;
}

interface NodeProps {
  node: MindMapNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}

const Node: React.FC<NodeProps> = ({ node, depth, expanded, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  
  const depthColors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-pink-500',
  ];
  
  const bgColor = node.color || depthColors[depth % depthColors.length];
  
  return (
    <div className="ml-4">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.05 }}
        className="flex items-center gap-2 py-1"
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ) : (
          <Circle className="w-2 h-2 mx-1.5 text-gray-400" />
        )}
        
        <div 
          className={`px-3 py-1.5 rounded-lg ${bgColor} bg-opacity-10 
            border border-opacity-30 ${bgColor.replace('bg-', 'border-')}`}
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {node.label}
          </span>
        </div>
      </motion.div>
      
      {hasChildren && isExpanded && (
        <div className="border-l border-gray-200 dark:border-gray-700 ml-3">
          {node.children!.map((child) => (
            <Node
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface MindMapViewProps {
  data: MindMapData;
  className?: string;
}

export const MindMapView: React.FC<MindMapViewProps> = ({ data, className = '' }) => {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    // Expand root and first level by default
    const initial = new Set<string>(['root']);
    if (data.root.children) {
      data.root.children.forEach((child) => initial.add(child.id));
    }
    return initial;
  });
  
  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const expandAll = () => {
    const all = new Set<string>();
    const traverse = (node: MindMapNode) => {
      all.add(node.id);
      node.children?.forEach(traverse);
    };
    traverse(data.root);
    setExpanded(all);
  };
  
  const collapseAll = () => {
    setExpanded(new Set(['root']));
  };
  
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {data.title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-purple-600 hover:underline"
          >
            Expand all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-purple-600 hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>
      
      {/* Mind map */}
      <div className="p-4 overflow-x-auto">
        <Node
          node={data.root}
          depth={0}
          expanded={expanded}
          onToggle={handleToggle}
        />
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700">
        Generated: {new Date(data.generated).toLocaleString()}
      </div>
    </div>
  );
};

export default MindMapView;
