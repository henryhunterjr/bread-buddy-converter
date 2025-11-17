import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LoadingStateProps {
  title: string;
  description: string;
  progress?: number;
}

export const LoadingState = ({ title, description, progress }: LoadingStateProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card border-bread-medium/20 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-burnt-orange" />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {progress !== undefined && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
