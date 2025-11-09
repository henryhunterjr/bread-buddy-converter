import { useState } from 'react';
import { ParsedIngredient } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pencil, Check } from 'lucide-react';

interface IngredientConfirmationProps {
  ingredients: ParsedIngredient[];
  onConfirm: (confirmed: ParsedIngredient[]) => void;
  onReject: () => void;
}

export function IngredientConfirmation({ 
  ingredients, 
  onConfirm, 
  onReject 
}: IngredientConfirmationProps) {
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState(ingredients);

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...edited];
    updated[index] = { ...updated[index], [field]: value };
    setEdited(updated);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-background rounded-lg shadow-lg border">
      <Alert className="mb-6">
        <AlertDescription>
          <strong>Review extracted ingredients:</strong> I found these from your recipe. 
          Click "Looks Good" to continue, or edit any values that seem wrong.
        </AlertDescription>
      </Alert>

      <div className="space-y-3 mb-6">
        {edited.map((ing, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded">
            {editMode ? (
              <>
                <Input
                  value={ing.amount}
                  onChange={(e) => updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-24"
                  type="number"
                />
                <span className="text-sm text-muted-foreground">g</span>
                <Input
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                  className="flex-1"
                />
              </>
            ) : (
              <>
                <span className="font-mono font-semibold w-24 text-right">
                  {ing.amount}g
                </span>
                <span className="flex-1">{ing.name}</span>
                <span className="text-xs text-muted-foreground bg-muted-foreground/10 px-2 py-1 rounded">
                  {ing.type}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {editMode ? (
          <>
            <Button 
              onClick={() => setEditMode(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel Edit
            </Button>
            <Button 
              onClick={() => {
                setEditMode(false);
                onConfirm(edited);
              }}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Save & Convert
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={onReject}
              variant="outline"
              className="flex-1"
            >
              Start Over
            </Button>
            <Button 
              onClick={() => setEditMode(true)}
              variant="outline"
              className="flex-1"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Values
            </Button>
            <Button 
              onClick={() => onConfirm(edited)}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Looks Good
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
