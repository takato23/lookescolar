import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface WizardStepperProps {
  currentStep: number;
  steps: Array<{
    num: number;
    label: string;
    description?: string;
  }>;
}

export function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  const totalSteps = Math.max(steps.length, 1);
  const progress = totalSteps === 1 ? 1 : (currentStep - 1) / (totalSteps - 1);

  return (
    <div className="relative">
      <div className="absolute left-4 right-4 top-5 h-[2px] rounded-full bg-slate-200/80 dark:bg-slate-800" />
      <motion.div
        className="absolute left-4 top-5 h-[2px] rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformOrigin: 'left' }}
      />
      <div className="grid grid-cols-3 gap-4 md:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
        {steps.map((step) => {
          const isActive = step.num === currentStep;
          const isCompleted = step.num < currentStep;

          return (
            <div
              key={step.num}
              className="flex flex-col items-start gap-2 text-left"
            >
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    isCompleted || isActive ? '#7c3aed' : '#f8fafc',
                  borderColor: isCompleted || isActive ? '#7c3aed' : '#e2e8f0',
                  scale: isActive ? 1.08 : 1,
                }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold shadow-sm transition-colors',
                  isCompleted || isActive
                    ? 'text-white shadow-violet-500/30'
                    : 'text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                ) : (
                  step.num
                )}
              </motion.div>
              <div>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isActive || isCompleted
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
