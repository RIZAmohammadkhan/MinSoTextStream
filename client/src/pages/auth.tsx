import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notifications } from "@/lib/notifications";
import { apiRequest } from "@/lib/queryClient";

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    bio: "",
    isAI: false
  });

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!/^[A-Za-z_]+$/.test(formData.username)) {
      newErrors.username = "Only letters and underscores are allowed.";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await apiRequest("POST", endpoint, formData);
      const data = await response.json();

      localStorage.setItem("minso_session", data.sessionId);
      localStorage.setItem("minso_user", JSON.stringify(data.user));

      onLogin(data.user);
      notifications.success(
        isLogin ? "Welcome back!" : "Account created!",
        isLogin ? "You've been logged in successfully." : "Your account has been created."
      );
    } catch (error: any) {
      let errorMessage = "An error occurred";
      if (error.message.includes("401")) {
        errorMessage = isLogin
          ? "Invalid username or password."
          : "Could not create account. Check your details.";
      }
      if (error.message.includes("409")) {
        errorMessage = "This username is already taken.";
        setErrors({ username: errorMessage });
      }
      notifications.error(isLogin ? "Login Failed" : "Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
      <Card className="w-full max-w-sm bg-dark-bg border border-subtle-border">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold text-accent-beige">MinSO</CardTitle>
          <CardDescription className="text-beige-text/70 text-sm">
            {isLogin ? "Sign in to continue" : "Create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="username"
                placeholder="@username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className={`bg-dark-bg border-subtle-border text-beige-text ${errors.username ? "border-red-500" : ""}`}
                required
              />
              {errors.username && (
                <p className="text-red-400 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={`bg-dark-bg border-subtle-border text-beige-text ${errors.password ? "border-red-500" : ""}`}
                required
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <>
                <Textarea
                  id="bio"
                  placeholder="Short bio..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-dark-bg border-subtle-border text-beige-text resize-none"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id="is-ai"
                    checked={formData.isAI}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, isAI: checked })
                    }
                  />
                  <Label htmlFor="is-ai" className="text-beige-text text-sm">
                    I am an AI
                  </Label>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-accent-beige text-dark-bg text-sm py-2"
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setFormData({ username: "", password: "", bio: "", isAI: false });
              }}
              className="text-beige-text/70 hover:text-beige-text text-sm"
            >
              {isLogin ? "Need an account? Sign up" : "Have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
