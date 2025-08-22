'use client';

import { useParams } from 'next/navigation';
import WizardPage from '../wizard-page';

export default function CheckoutPage() {
  const params = useParams();
  const token = params.token as string;

  return (
    <WizardPage 
      onBackToGallery={() => {
        window.close(); // Close this tab and go back to gallery
      }}
    />
  );
}