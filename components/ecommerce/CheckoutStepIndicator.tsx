'use client';

import { Box, Stack, Typography, Stepper, Step, StepLabel } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CheckoutStep, formatCheckoutStep } from '@/lib/types/ecommerceMockData';

const CustomStepper = styled(Stepper)({
  '& .MuiStepConnector-root': {
    top: '22px',
    left: 'calc(-50% + 16px)',
    right: 'calc(50% + 16px)',
  },
  '& .MuiStepConnector-line': {
    height: '3px',
    border: 0,
    backgroundColor: '#e5e7eb',
    borderRadius: '1px',
  },
  '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
    backgroundColor: '#1976d2',
  },
  '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
    backgroundColor: '#10b981',
  },
});

const CustomStepLabel = styled(StepLabel)({
  '& .MuiStepLabel-root': {
    padding: 0,
  },
  '& .MuiStepLabel-iconContainer': {
    paddingRight: 0,
  },
  '& .MuiStepIcon-root': {
    width: '32px',
    height: '32px',
    color: '#e5e7eb',
    '&.Mui-active': {
      color: '#1976d2',
    },
    '&.Mui-completed': {
      color: '#10b981',
    },
  },
  '& .MuiStepLabel-label': {
    marginTop: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#9ca3af',
    '&.Mui-active': {
      color: '#1976d2',
      fontWeight: 600,
    },
    '&.Mui-completed': {
      color: '#10b981',
      fontWeight: 600,
    },
  },
});

interface CheckoutStepIndicatorProps {
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
}

export function CheckoutStepIndicator({
  currentStep,
  completedSteps
}: CheckoutStepIndicatorProps) {
  const steps: CheckoutStep[] = [
    CheckoutStep.PACKAGE,
    CheckoutStep.PHOTOS,
    CheckoutStep.EXTRAS,
    CheckoutStep.CONTACT,
    CheckoutStep.PAYMENT
  ];

  const getActiveStep = () => {
    return steps.indexOf(currentStep);
  };

  const isStepCompleted = (step: CheckoutStep) => {
    return completedSteps.includes(step);
  };

  return (
    <Box sx={{ width: '100%', py: 3 }}>
      <CustomStepper activeStep={getActiveStep()} alternativeLabel>
        {steps.map((step) => (
          <Step key={step} completed={isStepCompleted(step)}>
            <CustomStepLabel>
              {formatCheckoutStep(step)}
            </CustomStepLabel>
          </Step>
        ))}
      </CustomStepper>
      
      {/* Progress Bar */}
      <Box sx={{ mt: 3, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Progreso:
          </Typography>
          <Box
            sx={{
              flex: 1,
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                backgroundColor: '#1976d2',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
                width: `${((getActiveStep() + 1) / steps.length) * 100}%`,
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 600 }}>
            {getActiveStep() + 1}/{steps.length}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}