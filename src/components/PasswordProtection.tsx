import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface PasswordProtectionProps {
  children: React.ReactNode;
  correctPassword: string;
  storageKey?: string;
}

export const PasswordProtection = ({ children, correctPassword, storageKey }: PasswordProtectionProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Create a unique storage key based on the password if not provided
  const authKey = storageKey || `auth_${correctPassword.slice(0, 8)}`;

  useEffect(() => {
    // Check if already authenticated in this session
    const authenticated = sessionStorage.getItem(authKey);
    if (authenticated === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [authKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedInput = String(password).trim();
    const normalizedCorrect = String(correctPassword).trim();

    console.log("[PasswordProtection] Submitted password:", normalizedInput);
    console.log("[PasswordProtection] Correct password:", normalizedCorrect);
    console.log("[PasswordProtection] Equal?", normalizedInput === normalizedCorrect);

    if (normalizedInput === normalizedCorrect) {
      setIsAuthenticated(true);
      sessionStorage.setItem(authKey, "true");
      toast.success("Access granted");
    } else {
      toast.error("Incorrect password");
      setPassword("");
    }
  };
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Analytics Access</CardTitle>
            <CardDescription>
              Enter the password to view analytics dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center text-lg tracking-wider"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
