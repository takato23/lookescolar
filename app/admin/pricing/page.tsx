import { Metadata } from 'next';
import { PricingManagement } from '@/components/admin/PricingManagement';

export const metadata: Metadata = {
  title: 'Gestión de Precios - LookEscolar Admin',
  description: 'Configura los precios de los paquetes y copias adicionales',
};

export default function PricingPage() {
  return (
    <div className="container mx-auto py-6">
      <PricingManagement />
    </div>
  );
}
