import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Internal pages (usage analytics with raw error logs, partner pitch deck) are
// DEV-ONLY: they never ship in the public production bundle. Run `npm run dev`
// locally to use the analytics dashboard.
const Analytics = import.meta.env.DEV ? lazy(() => import("./pages/Analytics")) : null;
const Presentation = import.meta.env.DEV ? lazy(() => import("./pages/Presentation")) : null;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {Analytics && (
            <Route
              path="/analytics"
              element={
                <Suspense fallback={null}>
                  <Analytics />
                </Suspense>
              }
            />
          )}
          {Presentation && (
            <Route
              path="/presentation"
              element={
                <Suspense fallback={null}>
                  <Presentation />
                </Suspense>
              }
            />
          )}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
