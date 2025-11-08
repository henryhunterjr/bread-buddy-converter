import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from '@/utils/recipeConverter';
import { generatePDF } from '@/utils/pdfGenerator';
import logo from '@/assets/logo.png';

interface OutputScreenProps {
  result: ConvertedRecipe;
  onStartOver: () => void;
}

export default function OutputScreen({ result, onStartOver }: OutputScreenProps) {
  const originalPercentages = calculateBakersPercentages(result.original);
  const convertedPercentages = calculateBakersPercentages(result.converted);

  const handleDownloadPDF = () => {
    generatePDF(result);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <img src={logo} alt="Baking Great Bread at Home" className="h-16 md:h-20" />
      </div>
      <div className="flex-1 p-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Recipe Converted: {result.direction === 'sourdough-to-yeast' ? 'Sourdough → Yeast' : 'Yeast → Sourdough'}
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Original Recipe */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Original Recipe</h2>
            <div className="space-y-2">
              {originalPercentages.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.ingredient}</span>
                  <span className="text-muted-foreground">
                    {item.amount.toFixed(0)}g ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-foreground">Hydration</span>
                  <span className="text-foreground">{result.original.hydration.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Converted Recipe */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Converted Recipe</h2>
            <div className="space-y-2">
              {convertedPercentages.map((item, i) => {
                const isChanged = !originalPercentages.find(
                  orig => orig.ingredient === item.ingredient && Math.abs(orig.amount - item.amount) < 1
                );
                return (
                  <div 
                    key={i} 
                    className={`flex justify-between text-sm ${isChanged ? 'bg-highlight rounded px-2 py-1' : ''}`}
                  >
                    <span className="text-foreground">{item.ingredient}</span>
                    <span className="text-muted-foreground">
                      {item.amount.toFixed(0)}g ({item.percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-foreground">Hydration</span>
                  <span className="text-foreground">{result.converted.hydration.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Method Updates */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Method Updates</h2>
            <div className="space-y-3">
              {result.methodChanges.map((change, i) => (
                <div key={i} className="text-sm">
                  <div className="font-bold text-foreground">✓ {change.step}</div>
                  <div className="text-muted-foreground">{change.change}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Method Text */}
        {result.original.method && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Original Method</h2>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {result.original.method}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={handleDownloadPDF} size="lg">
            Download PDF
          </Button>
          <Button onClick={onStartOver} variant="secondary" size="lg">
            Start Over
          </Button>
        </div>
      </div>
      </div>
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
