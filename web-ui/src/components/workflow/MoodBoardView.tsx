/**
 * MoodBoardView - Visual mood board display
 * 
 * Renders JSON mood board data with color palettes, images, and tags.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Image, Tag } from 'lucide-react';

interface MoodBoardItem {
  id: string;
  type: 'color' | 'image' | 'tag' | 'text';
  value: string;
  caption?: string;
}

interface MoodBoardSection {
  id: string;
  label: string;
  items: MoodBoardItem[];
}

interface MoodBoardData {
  type: 'moodboard';
  version: string;
  title: string;
  generated: string;
  sections: MoodBoardSection[];
}

interface ItemCardProps {
  item: MoodBoardItem;
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  
  switch (item.type) {
    case 'color':
      return (
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="rounded-lg overflow-hidden shadow-sm"
        >
          <div
            className="w-full h-20"
            style={{ backgroundColor: item.value }}
          />
          <div className="p-2 bg-white dark:bg-gray-800 text-center">
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {item.value}
            </span>
            {item.caption && (
              <p className="text-xs text-gray-500 mt-0.5">{item.caption}</p>
            )}
          </div>
        </motion.div>
      );
    
    case 'image':
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-lg overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800"
        >
          {item.value.startsWith('http') ? (
            <img
              src={item.value}
              alt={item.caption || 'Reference'}
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {item.caption && (
            <div className="p-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {item.caption}
              </p>
            </div>
          )}
        </motion.div>
      );
    
    case 'tag':
      return (
        <motion.span
          whileHover={{ scale: 1.05 }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full 
            bg-purple-100 dark:bg-purple-900/30 
            text-purple-700 dark:text-purple-300 
            text-sm font-medium"
        >
          <Tag className="w-3 h-3" />
          {item.value}
        </motion.span>
      );
    
    case 'text':
    default:
      return (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {item.value}
          </p>
          {item.caption && (
            <p className="text-xs text-gray-500 mt-1 italic">
              — {item.caption}
            </p>
          )}
        </div>
      );
  }
};

interface SectionViewProps {
  section: MoodBoardSection;
  index: number;
}

const SectionView: React.FC<SectionViewProps> = ({ section, index }) => {
  // Determine grid layout based on item types
  const hasColors = section.items.some((i) => i.type === 'color');
  const hasTags = section.items.every((i) => i.type === 'tag');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-8"
    >
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {section.label}
      </h4>
      
      {hasTags ? (
        <div className="flex flex-wrap gap-2">
          {section.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : hasColors ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {section.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {section.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface MoodBoardViewProps {
  data: MoodBoardData;
  className?: string;
}

export const MoodBoardView: React.FC<MoodBoardViewProps> = ({ data, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {data.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Visual mood board for reference and inspiration
        </p>
      </div>
      
      {/* Sections */}
      <div className="p-6">
        {data.sections.map((section, index) => (
          <SectionView key={section.id} section={section} index={index} />
        ))}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-3 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <span>Generated by Unreal Companion</span>
        <span>{new Date(data.generated).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default MoodBoardView;
