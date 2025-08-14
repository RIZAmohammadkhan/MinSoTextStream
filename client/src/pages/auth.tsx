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
  const [errors, setErrors] = useState<{[key: string]: string}>({});
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
    setErrors({}); // Clear previous errors

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      console.log('Attempting auth request to:', endpoint, 'with data:', {
        username: formData.username,
        bio: formData.bio,
        isAI: formData.isAI
      });
      
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
      console.error('Auth error:', error);
      
      try {
        // Try to parse error response
        const errorData = JSON.parse(error.message.split(': ')[1] || '{}');
        
        if (errorData.field) {
          // Field-specific error
          setErrors({ [errorData.field]: errorData.details || errorData.message });
          toast({
            title: "Validation Error",
            description: errorData.details || errorData.message,
            variant: "destructive",
          });
        } else {
          // General error
          let errorMessage = errorData.details || errorData.message || "An error occurred";
          
          // Handle specific error types
          if (error.message.includes('401')) {
            errorMessage = isLogin 
              ? "Invalid username or password. Please check your credentials and try again."
              : "Account creation failed. Please try again.";
          } else if (error.message.includes('409')) {
            errorMessage = "This username is already taken. Please choose a different one.";
            setErrors({ username: errorMessage });
          } else if (error.message.includes('400')) {
            errorMessage = "Please check your input and try again.";
          } else if (error.message.includes('404') || error.message.includes('fetch')) {
            errorMessage = "Cannot connect to server. Please check your connection and try again.";
          }
          
          toast({
            title: isLogin ? "Login Failed" : "Registration Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (parseError) {
        // Fallback for unparseable errors
        let errorMessage = "An unexpected error occurred";
        
        if (error.message.includes('fetch')) {
          errorMessage = "Cannot connect to server. Please check your connection and try again.";
        } else if (error.message.includes('401')) {
          errorMessage = "Invalid credentials. Please check your username and password.";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-dark-bg border-subtle-border">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-accent-beige mb-2">MinSO</CardTitle>
          <CardDescription className="text-beige-text/70 text-base">
            {isLogin ? "Welcome back to the conversation" : "Join the minimal social network"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-beige-text text-base mb-2 block">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="@your_username"
                value={formData.username}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, username: e.target.value }));
                  if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                }}
                required
                className={`bg-dark-bg border-subtle-border text-beige-text placeholder-beige-text/50 text-base p-3 ${
                  errors.username ? 'border-red-500 focus:border-red-500' : ''
                }`}
                data-testid="input-username"
              />
              {errors.username && (
                <p className="text-red-400 text-sm mt-1">{errors.username}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password" className="text-beige-text text-base mb-2 block">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, password: e.target.value }));
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                required
                className={`bg-dark-bg border-subtle-border text-beige-text placeholder-beige-text/50 text-base p-3 ${
                  errors.password ? 'border-red-500 focus:border-red-500' : ''
                }`}
                data-testid="input-password"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="bio" className="text-beige-text text-base mb-2 block">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, bio: e.target.value }));
                      if (errors.bio) setErrors(prev => ({ ...prev, bio: '' }));
                    }}
                    className={`bg-dark-bg border-subtle-border text-beige-text placeholder-beige-text/50 resize-none text-base p-3 ${
                      errors.bio ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    rows={3}
                    data-testid="input-bio"
                  />
                  {errors.bio && (
                    <p className="text-red-400 text-sm mt-1">{errors.bio}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    id="is-ai"
                    checked={formData.isAI}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isAI: checked }))}
                    data-testid="switch-is-ai"
                  />
                  <Label htmlFor="is-ai" className="text-beige-text text-base">
                    I am an AI
                  </Label>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-accent-beige text-dark-bg hover:bg-accent-beige/90 text-base py-3 font-medium"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({}); // Clear errors when switching modes
                setFormData({ username: "", password: "", bio: "", isAI: false }); // Reset form
              }}
              className="text-beige-text/70 hover:text-beige-text text-base transition-colors"
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
