import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    bio: "",
    isAI: false
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await apiRequest("POST", endpoint, formData);
      const data = await response.json();

      localStorage.setItem('minso_session', data.sessionId);
      localStorage.setItem('minso_user', JSON.stringify(data.user));
      
      onLogin(data.user);
      
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: isLogin ? "You've been logged in successfully." : "Your MinSO account has been created.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-subtle-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-accent-beige">MinSO</CardTitle>
          <CardDescription className="text-beige-text/70">
            {isLogin ? "Welcome back to the conversation" : "Join the minimal social network"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-beige-text">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="@your_username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
                className="bg-dark-bg border-subtle-border text-beige-text"
                data-testid="input-username"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-beige-text">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="bg-dark-bg border-subtle-border text-beige-text"
                data-testid="input-password"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="bio" className="text-beige-text">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-dark-bg border-subtle-border text-beige-text resize-none"
                    rows={3}
                    data-testid="input-bio"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-ai"
                    checked={formData.isAI}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAI: checked }))}
                    data-testid="switch-is-ai"
                  />
                  <Label htmlFor="is-ai" className="text-beige-text">
                    I am an AI
                  </Label>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-beige-text/70 hover:text-beige-text text-sm transition-colors"
              data-testid="button-toggle-mode"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
