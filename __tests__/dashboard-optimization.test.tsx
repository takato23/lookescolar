import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShortcutCard } from '@/components/admin/dashboard/ShortcutCard';
import { HighlightMetric } from '@/components/admin/dashboard/HighlightMetric';
import { AlertItem } from '@/components/admin/dashboard/AlertItem';
import { DashboardHeader } from '@/components/admin/dashboard/DashboardHeader';
import { Calendar, Camera, AlertCircle } from 'lucide-react';

describe('Dashboard Components', () => {
    it('renders ShortcutCard correctly', () => {
        render(
            <ShortcutCard
                id="test-shortcut"
                href="/test"
                title="Test Shortcut"
                description="Test Description"
                icon={Calendar}
            />
        );
        expect(screen.getByText('Test Shortcut')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders HighlightMetric correctly', () => {
        render(
            <HighlightMetric
                id="test-metric"
                label="Test Metric"
                value="100"
                helper="Test Helper"
                icon={Camera}
            />
        );
        expect(screen.getByText('Test Metric')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Test Helper')).toBeInTheDocument();
    });

    it('renders AlertItem correctly', () => {
        render(
            <AlertItem
                id="test-alert"
                title="Test Alert"
                description="Test Alert Description"
                badge="Action"
                tone="warning"
                icon={AlertCircle}
            />
        );
        expect(screen.getByText('Test Alert')).toBeInTheDocument();
        expect(screen.getByText('Test Alert Description')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('renders DashboardHeader correctly', () => {
        render(
            <DashboardHeader
                currentTime={new Date()}
                isLoading={false}
                error={null}
                onRefresh={() => { }}
                onOpenCommandPalette={() => { }}
            />
        );
        expect(screen.getByText('Panel de Operaciones')).toBeInTheDocument();
        expect(screen.getByText('En vivo')).toBeInTheDocument();
    });
});
