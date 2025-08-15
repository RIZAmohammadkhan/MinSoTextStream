import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notifications } from "@/lib/notifications";

export default function NotificationDemo() {
  const showSuccess = () => {
    notifications.success("Success!", "Your action was completed successfully.");
  };

  const showError = () => {
    notifications.error("Error occurred", "Something went wrong. Please try again.");
  };

  const showWarning = () => {
    notifications.warning("Warning", "Please review your action before proceeding.");
  };

  const showInfo = () => {
    notifications.info("Information", "Here's some helpful information for you.");
  };

  const showLoading = () => {
    const loadingToast = notifications.loading("Loading your data...");
    
    // Simulate async operation
    setTimeout(() => {
      notifications.dismiss();
      notifications.success("Loaded!", "Your data has been successfully loaded.");
    }, 3000);
  };

  const showPromise = () => {
    const asyncOperation = new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          resolve("Operation completed successfully!");
        } else {
          reject(new Error("Operation failed"));
        }
      }, 2000);
    });

    notifications.promise(asyncOperation, {
      loading: "Processing your request...",
      success: (data) => `Success: ${data}`,
      error: (error) => `Failed: ${error.message}`,
    });
  };

  const showAction = () => {
    notifications.action("Undo available", {
      label: "Undo",
      onClick: () => notifications.info("Action undone", "The previous action has been reversed."),
      description: "You just performed an action that can be undone.",
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="bg-card border-subtle-border">
        <CardHeader>
          <CardTitle className="text-beige-text">🔔 New Notification System Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={showSuccess} variant="default">
              ✅ Success
            </Button>
            <Button onClick={showError} variant="destructive">
              ❌ Error
            </Button>
            <Button onClick={showWarning} variant="outline">
              ⚠️ Warning
            </Button>
            <Button onClick={showInfo} variant="secondary">
              ℹ️ Info
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Button onClick={showLoading} variant="outline">
              ⏳ Loading Demo
            </Button>
            <Button onClick={showPromise} variant="outline">
              🎲 Promise Demo (Random Success/Fail)
            </Button>
            <Button onClick={showAction} variant="outline">
              🔄 Action Demo (with Undo)
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mt-6">
            <h4 className="font-semibold mb-2">✨ New Features:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Beautiful animations and transitions</li>
              <li>Better positioning and responsive design</li>
              <li>Promise-based notifications</li>
              <li>Action buttons for interactive notifications</li>
              <li>Loading states with automatic updates</li>
              <li>Rich colors and modern styling</li>
              <li>Expandable notifications for more content</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
