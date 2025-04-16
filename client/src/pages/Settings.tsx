import { useState } from 'react';
import { useSiteSelector, useUpdateSite } from '@/hooks/useSiteData';
import PageHeader from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SettingsPage() {
  const { currentSite } = useSiteSelector();
  const [activeTab, setActiveTab] = useState('general');
  
  if (!currentSite) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Site information not available. Please ensure you have selected a site.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader 
        title="Settings" 
        subtitle="Configure your energy management system settings"
      />
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="site">Site Configuration</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic system settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Application Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Display Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue={currentSite.timezone || "UTC"}>
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="temperature-unit">Temperature Unit</Label>
                    <Select defaultValue="celsius">
                      <SelectTrigger id="temperature-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celsius">Celsius (°C)</SelectItem>
                        <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select defaultValue="USD">
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Theme Settings</h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use dark theme for the application
                      </p>
                    </div>
                    <Switch id="dark-mode" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="animations" className="text-base">Enable Animations</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show animations in the user interface
                      </p>
                    </div>
                    <Switch id="animations" defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="site">
          <Card>
            <CardHeader>
              <CardTitle>Site Configuration</CardTitle>
              <CardDescription>Settings for your energy site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Site Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="site-name">Site Name</Label>
                    <Input id="site-name" placeholder="Site Name" defaultValue={currentSite.name} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="site-address">Site Address</Label>
                    <Input id="site-address" placeholder="Site Address" defaultValue={currentSite.address || ''} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="grid-capacity">Grid Connection Capacity (kW)</Label>
                    <Input 
                      id="grid-capacity" 
                      type="number" 
                      placeholder="11" 
                      defaultValue={currentSite.maxCapacity?.toString() || ''} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="grid-connection">Grid Connection Point (kW)</Label>
                    <Input 
                      id="grid-connection" 
                      type="number" 
                      placeholder="11" 
                      defaultValue={currentSite.gridConnectionPoint?.toString() || ''} 
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Grid Connection Settings</h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="feed-in-limit" className="text-base">Feed-in Limitation</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Limit feed-in to grid (e.g., 70% rule)
                      </p>
                    </div>
                    <Switch id="feed-in-limit" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smart-meter" className="text-base">Smart Meter Integration</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use smart meter data for precise measurements
                      </p>
                    </div>
                    <Switch id="smart-meter" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="grid-api" className="text-base">Grid API Integration</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Connect to grid operator API for dynamic tariffs
                      </p>
                    </div>
                    <Switch id="grid-api" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Site Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Notification Channels</h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications" className="text-base">Email Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive alerts via email
                      </p>
                    </div>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-address">Email Address</Label>
                    <Input id="email-address" type="email" placeholder="user@example.com" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-notifications" className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive alerts via SMS
                      </p>
                    </div>
                    <Switch id="sms-notifications" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Phone Number</Label>
                    <Input id="phone-number" type="tel" placeholder="+1 (555) 123-4567" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push-notifications" className="text-base">Push Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive alerts via web push notifications
                      </p>
                    </div>
                    <Switch id="push-notifications" defaultChecked />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Notification Preferences</h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="system-alerts" className="text-base">System Alerts</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Critical system issues and errors
                      </p>
                    </div>
                    <Switch id="system-alerts" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="optimization-suggestions" className="text-base">Optimization Suggestions</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        AI recommendations for improved efficiency
                      </p>
                    </div>
                    <Switch id="optimization-suggestions" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="energy-reports" className="text-base">Energy Reports</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Weekly and monthly summary reports
                      </p>
                    </div>
                    <Switch id="energy-reports" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="price-alerts" className="text-base">Price Alerts</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Notifications about significant energy price changes
                      </p>
                    </div>
                    <Switch id="price-alerts" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user access and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Users</h3>
                <Button size="sm">Add User</Button>
              </div>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-4 p-4 font-medium border-b">
                  <div>User</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div className="text-right">Actions</div>
                </div>
                <div className="divide-y">
                  <div className="grid grid-cols-4 p-4 items-center">
                    <div className="font-medium">Energy Admin</div>
                    <div className="text-gray-500 dark:text-gray-400">admin@example.com</div>
                    <div>
                      <span className="px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                        Admin
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 p-4 items-center">
                    <div className="font-medium">John Doe</div>
                    <div className="text-gray-500 dark:text-gray-400">john@example.com</div>
                    <div>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Viewer
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-500 dark:text-red-400">Remove</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 p-4 items-center">
                    <div className="font-medium">Jane Smith</div>
                    <div className="text-gray-500 dark:text-gray-400">jane@example.com</div>
                    <div>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Manager
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-500 dark:text-red-400">Remove</Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Roles & Permissions</h3>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Admin</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Full access to all features, including user management and system settings
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Manager</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Can configure devices, optimization settings, and view all data
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Viewer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Read-only access to dashboards and analytics
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">API User</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Machine-to-machine access for external systems integration
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings and maintenance options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Data Management</h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="data-retention" className="text-base">Data Retention</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        How long to keep historical data
                      </p>
                    </div>
                    <Select defaultValue="365">
                      <SelectTrigger id="data-retention" className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="730">2 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline">Export All Data</Button>
                    <Button variant="outline" className="text-red-500 dark:text-red-400">Delete All Data</Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">API Settings</h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="api-access" className="text-base">API Access</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enable external API access
                      </p>
                    </div>
                    <Switch id="api-access" defaultChecked />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="flex gap-2">
                      <Input id="api-key" className="font-mono" value="sk_live_51MxQzVCH•••••••••••••••" readOnly />
                      <Button variant="outline">Regenerate</Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Keep this key secure. It provides full access to your energy data.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="rate-limiting" className="text-base">Rate Limiting</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Limit API requests per minute
                      </p>
                    </div>
                    <Select defaultValue="60">
                      <SelectTrigger id="rate-limiting" className="w-[180px]">
                        <SelectValue placeholder="Requests per minute" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 req/min</SelectItem>
                        <SelectItem value="30">30 req/min</SelectItem>
                        <SelectItem value="60">60 req/min</SelectItem>
                        <SelectItem value="120">120 req/min</SelectItem>
                        <SelectItem value="0">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">System Information</h3>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Version</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">1.0.0 (build 2023.04.16)</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Database</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">PostgreSQL 15.2</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Update</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">April 16, 2025 21:25</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Environment</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Production</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
