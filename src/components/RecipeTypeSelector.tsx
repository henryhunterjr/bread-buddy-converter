import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wheat, CookingPot, HelpCircle } from 'lucide-react';
import { QuickBreadDetectionResult } from '@/utils/quickBreadDetector';

interface RecipeTypeSelectorProps {
  detectionResult?: QuickBreadDetectionResult;
  onSelectQuickBread: () => void;
  onSelectYeastBread: () => void;
  onCancel: () => void;
}

export function RecipeTypeSelector({
  detectionResult,
  onSelectQuickBread,
  onSelectYeastBread,
  onCancel,
}: RecipeTypeSelectorProps) {
  return (
    <Card className="p-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-bread-earth mb-2">
          What type of recipe is this?
        </h3>
        <p className="text-muted-foreground">
          I couldn't determine the leavening method for this recipe. Is this a quick bread
          (uses baking soda/powder) or a yeast bread?
        </p>
      </div>

      {detectionResult && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm">
          <p className="font-medium mb-2">Detection details:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-center gap-2">
              <Badge variant={detectionResult.hasFlour ? 'default' : 'secondary'}>
                {detectionResult.hasFlour ? '✓' : '✗'}
              </Badge>
              Flour detected
            </li>
            <li className="flex items-center gap-2">
              <Badge variant={detectionResult.hasChemicalLeavener ? 'default' : 'secondary'}>
                {detectionResult.hasChemicalLeavener ? '✓' : '✗'}
              </Badge>
              Chemical leavener (baking soda/powder)
            </li>
            <li className="flex items-center gap-2">
              <Badge variant={!detectionResult.hasYeast ? 'default' : 'secondary'}>
                {!detectionResult.hasYeast ? '✓' : '✗'}
              </Badge>
              No yeast
            </li>
            {detectionResult.hasYeast && (
              <li className="text-amber-600 ml-6">
                Found: {detectionResult.yeastIndicators.join(', ')}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:border-burnt-orange hover:bg-burnt-orange/5"
          onClick={onSelectQuickBread}
        >
          <CookingPot className="h-8 w-8 text-burnt-orange" />
          <div className="text-center">
            <p className="font-semibold">Quick Bread</p>
            <p className="text-xs text-muted-foreground">Uses baking soda/powder</p>
            <p className="text-xs text-muted-foreground mt-1">
              (banana bread, muffins, scones)
            </p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:border-bread-earth hover:bg-bread-light/50"
          onClick={onSelectYeastBread}
        >
          <Wheat className="h-8 w-8 text-bread-earth" />
          <div className="text-center">
            <p className="font-semibold">Yeast Bread</p>
            <p className="text-xs text-muted-foreground">Uses yeast or sourdough</p>
            <p className="text-xs text-muted-foreground mt-1">
              (sandwich bread, rolls, artisan loaves)
            </p>
          </div>
        </Button>
      </div>

      <Button
        variant="ghost"
        className="w-full mt-4"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </Card>
  );
}

export default RecipeTypeSelector;
