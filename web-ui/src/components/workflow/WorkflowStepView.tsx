/**
 * WorkflowStepView - Step-based workflow interface (Typeform-like)
 *
 * Features:
 * - Form-based questions from structured JSON
 * - Contextual intro from agent
 * - Smart suggestions based on context
 * - Pre-filled values from existing docs
 * - Skip logic for optional steps
 * - Progress indicator
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Loader2,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { ChoiceCards } from '../input/ChoiceCards';
import { AppreciationGauge } from '../input/AppreciationGauge';
import { EmojiScale } from '../input/EmojiScale';
import { SpectrumSlider } from '../input/SpectrumSlider';
import { DocumentUpload } from './DocumentUpload';
import { useTranslation } from '@/i18n/useI18n';

// === Types (matching backend schemas.py) ===

interface Option {
  id: string;
  label: string;
  value: string;
  description?: string;
  icon?: string;
  image?: string;
}

interface Suggestion {
  id: string;
  label: string;
  type: 'choice' | 'reference' | 'example' | 'action';
  description?: string;
  value?: string;
  reason?: string;
}

interface QuestionBlock {
  id: string;
  type: 'text' | 'textarea' | 'choice' | 'multi_choice' | 'choice_cards' | 'gauge' | 'emoji_scale' | 'spectrum';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Option[];
  suggestions?: string[];
  help_text?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  avatar: string;
  color?: string;
}

interface StepRenderData {
  step_id: string;
  step_number: number;
  total_steps: number;
  title: string;
  agent: AgentInfo;
  intro_text: string;
  questions: QuestionBlock[];
  suggestions: Suggestion[];
  prefilled: Record<string, string>;
  can_skip: boolean;
  skip_reason: string;
  is_complete: boolean;
  error?: string;
}

// === Agent color mapping ===
const AGENT_COLORS: Record<string, string> = {
  purple: 'from-purple-500 to-pink-500',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-red-500',
  pink: 'from-pink-500 to-rose-500',
};

// === Sub-components ===

interface ProgressBarProps {
  current: number;
  total: number;
  title: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, title }) => {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">
          {current} / {total}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
        />
      </div>
    </div>
  );
};

interface AgentIntroProps {
  agent: AgentInfo;
  intro: string;
}

const AgentIntro: React.FC<AgentIntroProps> = ({ agent, intro }) => {
  const agentColor = agent.color ? AGENT_COLORS[agent.color] || AGENT_COLORS.purple : AGENT_COLORS.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 mb-8"
    >
      {/* Agent avatar */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agentColor} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Sparkles className="w-6 h-6 text-white" />
      </div>

      {/* Intro text */}
      <div className="flex-1">
        <p className="text-sm font-medium text-primary mb-1">{agent.name}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};

interface QuestionInputProps {
  question: QuestionBlock;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  suggestions?: Suggestion[];
}

const QuestionInput: React.FC<QuestionInputProps> = ({
  question,
  value,
  onChange,
  suggestions,
}) => {
  const { t } = useTranslation();

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.value || suggestion.label);
  };

  // Get suggestions relevant to this field
  const fieldSuggestions = suggestions?.filter(s =>
    s.type === 'reference' || s.type === 'example'
  ) || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="mb-6"
    >
      {/* Label */}
      <label className="block mb-2">
        <span className="text-sm font-medium text-foreground">
          {question.label}
        </span>
        {question.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </label>

      {/* Help text */}
      {question.help_text && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          {question.help_text}
        </p>
      )}

      {/* Input based on type */}
      {question.type === 'text' && (
        <input
          type="text"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent
            transition-all"
        />
      )}

      {question.type === 'textarea' && (
        <textarea
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background
            text-foreground placeholder:text-muted-foreground resize-none
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent
            transition-all"
        />
      )}

      {question.type === 'choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onChange(option.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all
                ${value === option.value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:border-primary/50 text-foreground'
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>
                {value === option.value && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {question.type === 'multi_choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option.value);
            return (
              <button
                key={option.id}
                onClick={() => {
                  const currentValues = Array.isArray(value) ? value : [];
                  if (selected) {
                    onChange(currentValues.filter(v => v !== option.value));
                  } else {
                    onChange([...currentValues, option.value]);
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all
                  ${selected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/50 text-foreground'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {selected && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'choice_cards' && question.options && question.options.length >= 2 && (
        <ChoiceCards
          optionA={{
            id: question.options[0].id,
            label: question.options[0].label,
            description: question.options[0].description,
            icon: question.options[0].icon,
            image: question.options[0].image,
          }}
          optionB={{
            id: question.options[1].id,
            label: question.options[1].label,
            description: question.options[1].description,
            icon: question.options[1].icon,
            image: question.options[1].image,
          }}
          value={value as string}
          onChange={(v) => onChange(v)}
          allowOther={true}
        />
      )}

      {question.type === 'gauge' && (
        <AppreciationGauge
          value={value as string}
          onChange={(v) => onChange(v)}
          allowComment={false}
        />
      )}

      {question.type === 'emoji_scale' && question.options && (
        <EmojiScale
          options={question.options.map(opt => ({
            emoji: opt.icon || '❓',
            label: opt.label,
            value: opt.value,
          }))}
          value={value as string}
          onChange={(v) => onChange(v)}
          size="md"
        />
      )}

      {question.type === 'spectrum' && question.options && question.options.length >= 2 && (
        <SpectrumSlider
          leftExtreme={{
            label: question.options[0].label,
            description: question.options[0].description,
          }}
          rightExtreme={{
            label: question.options[1].label,
            description: question.options[1].description,
          }}
          value={typeof value === 'string' ? parseInt(value) || 50 : 50}
          onChange={(v) => onChange(String(v))}
          allowComment={false}
        />
      )}

      {/* Quick suggestions for this field */}
      {question.suggestions && question.suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {question.suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => onChange(sug)}
              className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-muted/80
                text-muted-foreground hover:text-foreground transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Contextual suggestions */}
      {fieldSuggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            {t('workflow.suggestions')}
          </p>
          {fieldSuggestions.map((sug) => (
            <button
              key={sug.id}
              onClick={() => handleSuggestionClick(sug)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm
                bg-primary/5 border border-primary/20
                hover:border-primary/40 hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium text-primary">
                {sug.label}
              </span>
              {sug.reason && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sug.reason}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface GlobalSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}

const GlobalSuggestions: React.FC<GlobalSuggestionsProps> = ({ suggestions, onSelect }) => {
  const { t } = useTranslation();

  if (!suggestions.length) return null;

  // Separate actionable suggestions from tips/references
  const actionSuggestions = suggestions.filter(s => s.type === 'action');
  const tipSuggestions = suggestions.filter(s =>
    s.type === 'reference' || s.type === 'example' || s.type === 'choice'
  );

  if (!actionSuggestions.length && !tipSuggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 pt-6 border-t border-border"
    >
      {/* Tips/References - shown as info cards, not buttons */}
      {tipSuggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            {t('workflow.suggestions')}
          </p>
          <div className="space-y-2">
            {tipSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="px-3 py-2 rounded-lg text-sm
                  bg-muted/50 border border-border/50 text-muted-foreground"
              >
                {sug.label}
                {sug.reason && (
                  <span className="text-xs opacity-70 ml-2">— {sug.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions - clickable buttons (only for actual actions) */}
      {actionSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actionSuggestions.map((sug) => (
            <button
              key={sug.id}
              onClick={() => onSelect(sug)}
              className="px-4 py-2 rounded-lg text-sm font-medium
                bg-secondary text-secondary-foreground border border-border
                hover:bg-secondary/80 hover:border-primary/30 transition-all
                shadow-sm"
            >
              {sug.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// === Main Component ===

interface WorkflowStepViewProps {
  stepData: StepRenderData;
  isLoading?: boolean;
  onSubmit: (responses: Record<string, string | string[]>) => void;
  onSkip?: () => void;
  onBack?: () => void;
  className?: string;
  // For document upload
  sessionId?: string;
  projectPath?: string;
}

export const WorkflowStepView: React.FC<WorkflowStepViewProps> = ({
  stepData,
  isLoading = false,
  onSubmit,
  onSkip,
  onBack,
  className = '',
  sessionId,
  projectPath,
}) => {
  const { t } = useTranslation();

  // Initialize form values with prefilled data
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when step changes
  useEffect(() => {
    setFormValues(stepData.prefilled || {});
    setErrors({});
  }, [stepData.step_id, stepData.prefilled]);

  const handleFieldChange = useCallback((fieldId: string, value: string | string[]) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user types
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    for (const question of stepData.questions) {
      if (question.required) {
        const value = formValues[question.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[question.id] = t('workflow.fieldRequired');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [stepData.questions, formValues]);

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onSubmit(formValues);
    }
  }, [validateForm, formValues, onSubmit]);

  const handleSuggestionSelect = useCallback((suggestion: Suggestion) => {
    if (suggestion.type === 'action') {
      // Handle special actions
      if (suggestion.id === 'skip' && onSkip) {
        onSkip();
        return;
      }
    }
    // For choice suggestions, include current form values plus the suggestion
    const submissionData = {
      ...formValues,
      _suggestion: suggestion.value || suggestion.label,
    };
    onSubmit(submissionData);
  }, [onSubmit, onSkip, formValues]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (stepData.error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('common.error')}</h3>
          <p className="text-muted-foreground mb-4">{stepData.error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              {t('common.back')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <ProgressBar
            current={stepData.step_number}
            total={stepData.total_steps}
            title={stepData.title}
          />

          {/* Agent intro */}
          {stepData.intro_text && stepData.agent && (
            <AgentIntro agent={stepData.agent} intro={stepData.intro_text} />
          )}

          {/* Document upload - only show on first step */}
          {stepData.step_number === 1 && sessionId && projectPath && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg border border-dashed border-border bg-muted/30"
            >
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                {t('workflow.documentUpload.title')}
              </p>
              <DocumentUpload
                sessionId={sessionId}
                projectPath={projectPath}
              />
            </motion.div>
          )}

          {/* Questions */}
          <AnimatePresence mode="wait">
            {stepData.questions.map((question) => (
              <QuestionInput
                key={question.id}
                question={question}
                value={formValues[question.id] || ''}
                onChange={(value) => handleFieldChange(question.id, value)}
                // Don't pass global suggestions - they're shown separately below
                suggestions={[]}
              />
            ))}
          </AnimatePresence>

          {/* Validation errors */}
          {Object.keys(errors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-6"
            >
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('workflow.fillRequiredFields')}
              </p>
            </motion.div>
          )}

          {/* Global suggestions */}
          <GlobalSuggestions
            suggestions={stepData.suggestions}
            onSelect={handleSuggestionSelect}
          />
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="border-t border-border px-6 py-4 bg-background">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Left: Back button */}
          <div>
            {onBack && stepData.step_number > 1 && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                  text-muted-foreground hover:text-foreground
                  hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('common.back')}
              </button>
            )}
          </div>

          {/* Right: Skip + Next */}
          <div className="flex items-center gap-3">
            {stepData.can_skip && onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                  text-muted-foreground hover:text-foreground
                  hover:bg-muted transition-colors"
                title={stepData.skip_reason}
              >
                <SkipForward className="w-4 h-4" />
                {t('common.skip')}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg
                bg-primary text-primary-foreground font-medium
                hover:bg-primary/90 disabled:opacity-50
                transition-colors shadow-sm"
            >
              {stepData.step_number === stepData.total_steps ? (
                <>
                  {t('common.finish')}
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  {t('common.continue')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStepView;
