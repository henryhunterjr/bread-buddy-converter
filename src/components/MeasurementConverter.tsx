import { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Hardcoded conversion chart (no API, no lag)
const CONVERSIONS = {
  flour: {
    cup: 120,
    tbsp: 7.5,
    tsp: 2.5,
  },
  sugar: {
    cup: 200,
    tbsp: 12.5,
    tsp: 4.2,
  },
  butter: {
    cup: 227,
    tbsp: 14.2,
    tsp: 4.7,
  },
  water: {
    cup: 240,
    tbsp: 15,
    tsp: 5,
  },
  milk: {
    cup: 245,
    tbsp: 15.3,
    tsp: 5.1,
  },
  oil: {
    cup: 218,
    tbsp: 13.6,
    tsp: 4.5,
  },
  salt: {
    cup: 292,
    tbsp: 18,
    tsp: 6,
  },
  yeast: {
    cup: 128,
    tbsp: 8,
    tsp: 2.7,
  },
};

type Ingredient = keyof typeof CONVERSIONS;
type Unit = 'cup' | 'tbsp' | 'tsp' | 'g';

export function MeasurementConverter() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('1');
  const [ingredient, setIngredient] = useState<Ingredient>('flour');
  const [fromUnit, setFromUnit] = useState<Unit>('cup');
  const [result, setResult] = useState<number | null>(null);

  const convert = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setResult(null);
      return;
    }

    if (fromUnit === 'g') {
      // Converting FROM grams TO cups/tbsp/tsp
      setResult(null);
      return;
    }

    // Converting TO grams
    const gramsPerUnit = CONVERSIONS[ingredient][fromUnit as 'cup' | 'tbsp' | 'tsp'];
    const grams = value * gramsPerUnit;
    setResult(Math.round(grams * 10) / 10); // Round to 1 decimal
  };

  // Auto-convert on any change (instant)
  const handleAmountChange = (val: string) => {
    setAmount(val);
    setTimeout(convert, 0);
  };

  const handleIngredientChange = (val: Ingredient) => {
    setIngredient(val);
    setTimeout(convert, 0);
  };

  const handleUnitChange = (val: Unit) => {
    setFromUnit(val);
    setTimeout(convert, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg bg-warm-orange hover:bg-warm-orange-hover text-white border-2 border-golden-yellow z-40 print:hidden"
        >
          <Calculator className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-warm-orange" />
            Quick Converter
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="1"
              className="text-lg"
              step="0.25"
            />
          </div>

          {/* Ingredient Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ingredient</label>
            <Select value={ingredient} onValueChange={handleIngredientChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flour">Flour (120g/cup)</SelectItem>
                <SelectItem value="sugar">Sugar (200g/cup)</SelectItem>
                <SelectItem value="butter">Butter (227g/cup)</SelectItem>
                <SelectItem value="water">Water (240g/cup)</SelectItem>
                <SelectItem value="milk">Milk (245g/cup)</SelectItem>
                <SelectItem value="oil">Oil (218g/cup)</SelectItem>
                <SelectItem value="salt">Salt (292g/cup)</SelectItem>
                <SelectItem value="yeast">Yeast (128g/cup)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unit Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <Select value={fromUnit} onValueChange={handleUnitChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cup">Cups</SelectItem>
                <SelectItem value="tbsp">Tablespoons (tbsp)</SelectItem>
                <SelectItem value="tsp">Teaspoons (tsp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result Display */}
          {result !== null && (
            <div className="p-4 bg-accent/50 rounded-lg border-2 border-warm-orange">
              <div className="text-sm text-muted-foreground mb-1">Result</div>
              <div className="text-3xl font-bold text-foreground">
                {result}g
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {amount} {fromUnit} of {ingredient} = {result} grams
              </div>
            </div>
          )}

          {/* Quick Reference Chart */}
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">Quick Reference (per cup)</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/30 rounded">
                <span className="font-medium">Flour:</span> 120g
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="font-medium">Sugar:</span> 200g
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="font-medium">Butter:</span> 227g
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="font-medium">Water:</span> 240g
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
