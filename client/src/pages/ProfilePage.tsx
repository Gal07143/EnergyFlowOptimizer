import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile, ProfileFormData, PasswordFormData } from '@/hooks/use-profile';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { AlertTriangle, Mail, User, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { profileFormSchema, passwordFormSchema } from '@/hooks/use-profile';

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('profile');
  const { profile, isLoading, updateProfile, isUpdating, changePassword, isChangingPassword } = useProfile();

  // Profile form setup
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
    },
  });

  // Update form defaults when profile data loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        username: profile.username || '',
        email: profile.email || '',
      });
    }
  }, [profile, profileForm]);

  // Password form setup
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfile(data, {
      onSuccess: () => {
        // Form will be reset with new data via the useEffect
      }
    });
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePassword(data, {
      onSuccess: () => {
        passwordForm.reset();
      }
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            You need to be logged in to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-3xl font-bold mb-8">User Profile</h2>
      
      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile Information
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="flex items-center border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background">
                            <span className="pl-3 text-muted-foreground">
                              <User className="h-4 w-4" />
                            </span>
                            <Input className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="flex items-center border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background">
                            <span className="pl-3 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                            </span>
                            <Input className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {user.isEmailVerified ? (
                            <span className="text-green-600">✓ Your email is verified</span>
                          ) : (
                            <span className="text-yellow-600">⚠️ Your email is not verified</span>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isUpdating || !profileForm.formState.isDirty}
                      className="flex gap-2"
                    >
                      {isUpdating && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      Update Profile
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Change your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 6 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword || !passwordForm.formState.isDirty}
                      className="flex gap-2"
                    >
                      {isChangingPassword && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      Change Password
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Role and Permissions</CardTitle>
            <CardDescription>
              Your current role and permissions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <div className="mt-1 p-3 border rounded-md bg-background">
                  <span className="capitalize font-medium">{user.role}</span>
                </div>
              </div>
              
              <div>
                <Label>Site ID</Label>
                <div className="mt-1 p-3 border rounded-md bg-background">
                  {user.siteId ? `Site #${user.siteId}` : 'Not assigned to any site'}
                </div>
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="mt-1 p-3 border rounded-md bg-background space-y-2">
                  {user.role === 'admin' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Full system access</li>
                      <li>Manage users and assign roles</li>
                      <li>Delete and modify all resources</li>
                      <li>Access all sites and devices</li>
                    </ul>
                  )}
                  
                  {user.role === 'manager' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Create and modify resources</li>
                      <li>Configure optimization settings</li>
                      <li>Set up tariffs and devices</li>
                      <li>Cannot delete system resources</li>
                    </ul>
                  )}
                  
                  {user.role === 'viewer' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>View all system data</li>
                      <li>Access dashboards and reports</li>
                      <li>No modification permissions</li>
                      <li>Limited to assigned site data</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {user.isEmailVerified ? 
                "Your account has been fully verified." : 
                "Please verify your email address to access all features."}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;