import { LookEscolarConcept } from '@/components/design/LookEscolarConcept';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LookEscolar - Concepto de Diseño Cálido | Galerías Familiares',
  description: 'Explora el concepto de diseño cálido de LookEscolar: dashboards sci-fi con vidrio esmerilado, gradientes dorados y tipografía elegante. Una experiencia visual única para galerías familiares.',
  keywords: ['LookEscolar', 'diseño', 'galerías familiares', 'sci-fi', 'vidrio esmerilado', 'gradientes dorados', 'UX', 'UI'],
  authors: [{ name: 'LookEscolar Team' }],
  openGraph: {
    title: 'LookEscolar - Concepto de Diseño Cálido',
    description: 'Galerías familiares con el pulso de un amanecer. Un lenguaje visual inspirado en dashboards sci-fi cálidos.',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LookEscolar - Diseño Cálido',
    description: 'Explora nuestro concepto de diseño único para galerías familiares.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LookEscolarPreviewPage() {
  return <LookEscolarConcept />;
}
