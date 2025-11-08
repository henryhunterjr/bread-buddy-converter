import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LandingScreenProps {
  onSelectDirection: (direction: 'sourdough-to-yeast' | 'yeast-to-sourdough') => void;
}

export default function LandingScreen({ onSelectDirection }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Recipe Converter: Sourdough ↔ Yeast
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Convert any bread recipe between sourdough and instant yeast. The math is handled. You just bake.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => onSelectDirection('sourdough-to-yeast')}
            >
              Convert Sourdough → Yeast
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6"
              onClick={() => onSelectDirection('yeast-to-sourdough')}
            >
              Convert Yeast → Sourdough
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
