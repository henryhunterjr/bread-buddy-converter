import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) => {
  return (
    <Card className="w-full max-w-md mx-auto p-8 bg-card border-bread-medium/20 shadow-lg">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-bread-light rounded-full">
          <Icon className="h-12 w-12 text-burnt-orange" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-serif font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction}
            className="bg-burnt-orange hover:bg-burnt-orange/90 text-white"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};
