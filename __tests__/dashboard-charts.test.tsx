import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { ActivityChart } from '@/components/admin/dashboard/ActivityChart';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('Dashboard Charts', () => {
    const mockRevenueData = [
        { date: 'Lun', revenue: 120000 },
        { date: 'Mar', revenue: 150000 },
    ];

    const mockActivityData = [
        { date: 'Lun', uploads: 45, orders: 12 },
        { date: 'Mar', uploads: 52, orders: 15 },
    ];

    it('renders RevenueChart without crashing', () => {
        render(<RevenueChart data={mockRevenueData} />);
        expect(screen.getByText('Ingresos Recientes')).toBeInTheDocument();
    });

    it('renders ActivityChart without crashing', () => {
        render(<ActivityChart data={mockActivityData} />);
        expect(screen.getByText('Actividad Diaria')).toBeInTheDocument();
    });
});
