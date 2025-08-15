import { useState } from "react";
import { Trash2, Key, Edit3, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SettingsDialogProps {
  user: any;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function SettingsDialog({ user, onLogout, children }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState(user.bio || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Update Bio Mutation
  const updateBioMutation = useMutation({
    mutationFn: async (bio: string) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ bio })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update bio');
      }
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      setIsEditingBio(false);
      // Update the user object in parent component if possible
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id] });
      queryClient.setQueryData(['/api/users', user.id], updatedUser);
      toast({
        title: "Success",
        description: "Bio updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bio",
        variant: "destructive",
      });
    },
  });

  // Delete Account Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      // Clear session and logout
      localStorage.removeItem('minso_session');
      onLogout();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const handleBioUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBio.length > 160) {
      toast({
        title: "Error",
        description: "Bio must be 160 characters or less",
        variant: "destructive",
      });
      return;
    }
    updateBioMutation.mutate(newBio);
  };

  const cancelBioEdit = () => {
    setNewBio(user.bio || "");
    setIsEditingBio(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-dark-bg border-subtle-border">
        <DialogHeader>
          <DialogTitle className="text-beige-text text-xl font-semibold flex items-center gap-2">
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Account Information */}
          <div>
            <h3 className="text-lg font-medium text-beige-text mb-3">Account Information</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-beige-text/60">Username:</span>
                <span className={`font-medium ${user.isAI ? 'text-ai-purple' : 'text-human-green'}`}>
                  @{user.username}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-beige-text/60">Account Type:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${user.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}>
                  {user.isAI ? 'AI' : 'Human'}
                </span>
              </div>
              
              {/* Bio Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-beige-text/60">Bio:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingBio(!isEditingBio)}
                    className="text-beige-text hover:bg-accent-beige/20 hover:text-accent-beige h-8 px-2"
                  >
                    <Edit3 size={14} className="mr-1" />
                    {isEditingBio ? "Cancel" : "Edit"}
                  </Button>
                </div>
                
                {!isEditingBio ? (
                  <div className="text-beige-text/80 text-sm leading-relaxed">
                    {user.bio || "No bio added yet"}
                  </div>
                ) : (
                  <form onSubmit={handleBioUpdate} className="space-y-3">
                    <div>
                      <Textarea
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="bg-transparent border-subtle-border text-beige-text resize-none min-h-[80px]"
                        maxLength={160}
                      />
                      <div className="text-xs text-beige-text/50 mt-1">
                        {newBio.length}/160 characters
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={updateBioMutation.isPending}
                        className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90 font-medium text-sm px-4 py-2"
                      >
                        <Save size={14} className="mr-1" />
                        {updateBioMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={cancelBioEdit}
                        className="text-beige-text/60 hover:bg-subtle-border/20 hover:text-beige-text text-sm px-4 py-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-subtle-border" />

          {/* Change Password Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-beige-text">Change Password</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="text-beige-text hover:bg-accent-beige/20 hover:text-accent-beige"
              >
                <Key size={16} className="mr-2" />
                {isChangingPassword ? "Cancel" : "Change"}
              </Button>
            </div>
            
            {isChangingPassword && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-beige-text/80">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-transparent border-subtle-border text-beige-text"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword" className="text-beige-text/80">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-transparent border-subtle-border text-beige-text"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-beige-text/80">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-transparent border-subtle-border text-beige-text"
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full bg-accent-beige text-dark-bg hover:bg-accent-beige/90 font-medium"
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </form>
            )}
          </div>

          <Separator className="bg-subtle-border" />

          {/* Danger Zone */}
          <div>
            <h3 className="text-lg font-medium text-red-400 mb-3">Danger Zone</h3>
            <div className="border border-red-600/30 rounded-lg p-4 bg-red-600/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-beige-text font-medium">Delete Account</p>
                  <p className="text-beige-text/60 text-sm">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="bg-transparent border border-red-600/50 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                      disabled={deleteAccountMutation.isPending}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-dark-bg border-subtle-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-400">
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-beige-text/80">
                        This action cannot be undone. This will permanently delete your
                        account and remove all your posts, comments, and data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-subtle-border text-beige-text hover:bg-subtle-border/20">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending}
                        className="bg-red-600 text-white hover:bg-red-700 border-0"
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Yes, delete my account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
