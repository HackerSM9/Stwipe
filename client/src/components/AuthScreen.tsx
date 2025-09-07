import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error handling is done in the auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Stwipe
          </h1>
          <p className="text-muted-foreground">
            Transform playlists into focused study shorts
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Get Started
            </h2>

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-3"
              data-testid="button-google-signin"
            >
              <FaGoogle className="w-5 h-5 text-blue-600" />
              <span className="font-medium">
                {loading ? "Signing in..." : "Continue with Google"}
              </span>
            </Button>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Sign in or create an account instantly with Google
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
