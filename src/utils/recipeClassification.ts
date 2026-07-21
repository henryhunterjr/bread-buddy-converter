import { ParsedIngredient, RecipeClassification } from '@/types/recipe';

const rules: Array<{ type: RecipeClassification['type']; patterns: RegExp[]; label: string }> = [
  { type: 'focaccia', patterns: [/focaccia/i, /dimple/i, /brine/i, /stretch.{0,30}corner/i, /\b9\s*[x×]\s*13\b/i, /pan oil/i], label: 'focaccia method, pan, dimples, or brine' },
  { type: 'cinnamon-rolls', patterns: [/cinnamon roll/i, /roll up/i, /filling/i, /slice into rolls/i], label: 'filled roll language' },
  { type: 'rolls', patterns: [/(?<!cinnamon\s)\b(?:dinner|bread|hamburger) rolls?\b/i, /divide into rolls/i], label: 'roll shaping language' },
  { type: 'pizza', patterns: [/pizza/i, /pizza stone/i, /pizza steel/i, /stretch.{0,20}dough/i], label: 'pizza language or equipment' },
  { type: 'bagels', patterns: [/bagel/i, /boil.{0,20}water/i, /malt bath/i], label: 'bagel boiling language' },
  { type: 'pretzels', patterns: [/pretzel/i, /baking soda bath/i, /lye bath/i], label: 'pretzel bath language' },
  { type: 'sandwich-loaf', patterns: [/tangzhong/i, /water roux/i], label: 'tangzhong or water roux' },
  { type: 'brioche', patterns: [/brioche/i, /high butter/i], label: 'brioche language' },
  { type: 'challah', patterns: [/challah/i, /braid/i], label: 'challah language' },
  { type: 'sandwich-loaf', patterns: [/sandwich loaf/i, /loaf pan/i, /pullman/i], label: 'pan-loaf language' },
  { type: 'baguette', patterns: [/baguette/i, /coupe/i], label: 'baguette language' },
  { type: 'flatbread', patterns: [/flatbread/i, /naan/i, /pita/i, /griddle/i], label: 'flatbread language' },
  { type: 'laminated-dough', patterns: [/laminat/i, /croissant/i, /turns?/i], label: 'lamination language' },
  { type: 'batter-bread', patterns: [/batter/i, /quick bread/i, /banana bread/i], label: 'batter-style language' },
];

export function classifyRecipe(text: string, ingredients: ParsedIngredient[] = []): RecipeClassification {
  const source = `${text}\n${ingredients.map(i => `${i.name} ${i.section ?? ''}`).join('\n')}`;
  const scores = rules.map(rule => ({
    ...rule,
    score: rule.patterns.reduce((n, pattern) => n + (pattern.test(source) ? 1 : 0), 0),
  })).filter(rule => rule.score > 0).sort((a, b) => b.score - a.score);

  if (scores.length) {
    const winner = scores[0];
    const confidence = Math.min(0.98, 0.55 + winner.score * 0.12 + (scores.length > 1 ? 0.08 : 0));
    return { type: winner.type, confidence, signals: [winner.label], reviewRequired: confidence < 0.72 };
  }

  const flour = ingredients.filter(i => i.type === 'flour').reduce((n, i) => n + i.amount, 0);
  const sugar = ingredients.filter(i => i.type === 'sweetener').reduce((n, i) => n + i.amount, 0);
  const butter = ingredients.filter(i => /butter|lard|shortening|ghee/i.test(i.name)).reduce((n, i) => n + i.amount, 0);
  if (flour && (sugar / flour > 0.05 || butter / flour > 0.05)) {
    return { type: 'enriched-bread', confidence: 0.68, signals: ['meaningful sugar or solid fat'], reviewRequired: true };
  }
  if (/banneton|boule|batard|dutch oven|score/i.test(text)) {
    return { type: 'lean-hearth-loaf', confidence: 0.82, signals: ['hearth-loaf shaping or equipment'], reviewRequired: false };
  }
  return { type: 'unknown', confidence: 0.25, signals: [], reviewRequired: true };
}

export function classificationContradictions(classification: RecipeClassification, method: string): string[] {
  const contradictions: string[] = [];
  if (classification.type === 'focaccia' && /banneton|boule|batard|dutch oven|\bscore\b/i.test(method)) {
    contradictions.push('Focaccia classification conflicts with banneton, boule/batard, scoring, or Dutch-oven instructions.');
  }
  if (classification.type === 'lean-hearth-loaf' && /dimple|brine|9\s*[x×]\s*13|pan oil/i.test(method)) {
    contradictions.push('Hearth-loaf classification conflicts with pan-focaccia instructions.');
  }
  return contradictions;
}
