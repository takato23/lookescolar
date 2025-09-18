// Temporary wrapper components for glass button styling
import { Button } from './button';
import { cn } from '@/lib/utils/cn';

export const PremiumGlassButton = ({ className, ...props }: any) => (
  <Button 
    className={cn(
      "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20",
      className
    )} 
    {...props} 
  />
);

export const PremiumIconButton = ({ className, ...props }: any) => (
  <Button 
    size="icon"
    variant="ghost"
    className={cn(
      "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20",
      className
    )} 
    {...props} 
  />
);