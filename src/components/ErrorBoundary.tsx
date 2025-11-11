import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details to console for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleStartOver = () => {
    // Reset error state and reload the page
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8 space-y-6 bg-background/95 backdrop-blur border-bread-medium/20 shadow-xl">
            <div className="flex items-center gap-4 text-destructive">
              <AlertCircle className="h-12 w-12 flex-shrink-0" />
              <h1 className="text-2xl md:text-3xl font-bold font-serif">
                Oops! Something went wrong with your conversion.
              </h1>
            </div>

            <div className="space-y-4 text-muted-foreground">
              <p className="text-base leading-relaxed">
                This is a beta - we're still fixing bugs. Please try:
              </p>

              <ul className="space-y-2 ml-4 text-base">
                <li>• Refreshing the page</li>
                <li>• Simplifying your recipe</li>
                <li>• Contacting Henry at <a href="mailto:henrysbreadkitchen@gmail.com" className="text-foreground font-semibold hover:underline">henrysbreadkitchen@gmail.com</a></li>
              </ul>
            </div>

            <div className="pt-4">
              <Button
                size="lg"
                onClick={this.handleStartOver}
                className="w-full bg-gradient-to-r from-bread-gold to-bread-wheat hover:from-bread-wheat hover:to-bread-gold transition-all duration-300 shadow-lg text-bread-earth font-semibold"
              >
                Start Over
              </Button>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-muted/50 rounded-lg text-xs">
                <summary className="cursor-pointer font-semibold text-foreground mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="overflow-auto text-muted-foreground whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
