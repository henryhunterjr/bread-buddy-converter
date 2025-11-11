import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            How to Use Bread Buddy
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-6">
            {/* SECTION 1: HOW TO USE */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground font-serif">
                Converting Your Recipe (3 Easy Steps)
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Step 1: Choose your conversion direction
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>
                      <strong className="text-foreground">Sourdough → Yeast:</strong> Makes recipes faster, easier for beginners
                    </li>
                    <li>
                      <strong className="text-foreground">Yeast → Sourdough:</strong> Adds flavor and keeps bread fresh longer
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Step 2: Add your recipe
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Paste text from a website or your notes</li>
                    <li>• Upload a photo of a recipe card</li>
                    <li>• Upload a PDF from a cookbook</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Step 3: Review and convert
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Check that ingredients were detected correctly</li>
                    <li>• Click "Edit Values" if anything needs adjustment</li>
                    <li>• Click "Convert Recipe" and download your PDF</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            {/* SECTION 2: UNDERSTANDING RESULTS */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground font-serif">
                Understanding Your Results
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    What Baker's Percentages Mean
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every ingredient is shown as a percentage of total flour weight:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• 500g flour = <strong className="text-foreground">100%</strong></li>
                    <li>• 350g water = <strong className="text-foreground">70%</strong> (this is the hydration)</li>
                    <li>• 10g salt = <strong className="text-foreground">2%</strong></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Why Did My Liquid Amounts Change?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    When converting between sourdough and yeast, we adjust liquids to maintain the same <strong className="text-foreground">hydration</strong> (water-to-flour ratio). This keeps your dough the same texture as the original.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* SECTION 3: TIPS FOR BEST RESULTS */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground font-serif">
                Tips for Best Results
              </h2>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Use <strong className="text-foreground">gram measurements</strong> when possible (more accurate)</li>
                <li>• Include both <strong className="text-foreground">ingredients AND method steps</strong></li>
                <li>• For photos: <strong className="text-foreground">clear, well-lit, straight-on shots</strong> work best</li>
                <li>• Check that <strong className="text-foreground">flour, water, salt, and yeast/starter</strong> were detected</li>
              </ul>
            </section>

            <Separator />

            {/* SECTION 4: COMMON QUESTIONS */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground font-serif">
                Common Questions
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Q: Can I adjust the final hydration?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Not yet - coming in a future update. For now, the converter maintains your original hydration.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Q: Why does my milk amount change?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Milk is counted as liquid. When we add starter (which contains water), we reduce milk proportionally to maintain hydration.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Q: What if the converter gets my ingredients wrong?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Click "Edit Values" on the confirmation screen to correct amounts or types.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Q: Can I save my converted recipes?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Yes! Click "Save Recipe" after converting. Find saved recipes in the sidebar.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
