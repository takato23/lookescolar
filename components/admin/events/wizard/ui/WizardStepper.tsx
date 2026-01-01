import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface WizardStepperProps {
    currentStep: number;
}

const STEPS = [
    { num: 1, label: 'Básicos' },
    { num: 2, label: 'Distribución' },
    { num: 3, label: 'Estilo' },
];

export function WizardStepper({ currentStep }: WizardStepperProps) {
    return (
        <div className="flex items-center justify-between relative max-w-lg mx-auto">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full" />

            {/* Progress line */}
            <motion.div
                className="absolute top-1/2 left-0 h-1 bg-violet-600 -z-0 rounded-full origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: (currentStep - 1) / (STEPS.length - 1) }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />

            {STEPS.map((step) => {
                const isActive = step.num <= currentStep;
                const isCompleted = step.num < currentStep;

                return (
                    <div key={step.num} className="flex flex-col items-center gap-2">
                        <motion.div
                            initial={false}
                            animate={{
                                backgroundColor: isActive ? '#7c3aed' : '#ffffff',
                                borderColor: isActive ? '#7c3aed' : '#e2e8f0',
                                scale: isActive ? 1.1 : 1
                            }}
                            className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300 shadow-sm",
                            )}
                        >
                            {isCompleted ? (
                                <Check className="w-5 h-5 text-white" strokeWidth={3} />
                            ) : (
                                <span className={cn("text-xs font-bold", isActive ? "text-white" : "text-slate-400")}>
                                    {step.num}
                                </span>
                            )}
                        </motion.div>
                        <span className={cn(
                            "text-xs font-medium absolute top-10 w-20 text-center transition-colors duration-300",
                            isActive ? "text-violet-700" : "text-slate-400"
                        )}>
                            {step.label}
                        </span>
                    </div>
                )
            })}
        </div>
    );
}
