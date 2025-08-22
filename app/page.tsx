import Link from 'next/link';
import ScrollHeader from '@/components/ui/scroll-header';
import {
  Camera,
  Heart,
  Shield,
  Sparkles,
  Play,
  Star,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the new landing page
  redirect('/landing');
}
