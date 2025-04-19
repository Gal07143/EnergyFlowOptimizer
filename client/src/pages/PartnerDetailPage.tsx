import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Users, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

type Partner = {
  id: number;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
};

type Site = {
  id: number;
  name: string;
  address: string;
  status: string;
  timezone: string;
  createdAt: string;
};

export default function PartnerDetailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/partners/:id');
  const partnerId = params?.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState('overview');

  // Admin check
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Unauthorized Access</CardTitle>
              <CardDescription>Only administrators can access this page</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p>You need administrator privileges to view partner details.</p>
          </CardContent>
          <Button onClick={() => navigate('/')} className="ml-4 mt-2">Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  // Fetch partner details
  const {
    data: partner,
    isLoading: partnerLoading,
    isError: partnerError,
  } = useQuery({
    queryKey: ['/api/partners', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/partners/${partnerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch partner details');
      }
      return response.json();
    },
    enabled: !!partnerId,
  });

  // Fetch partner users
  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ['/api/partners', partnerId, 'users'],
    queryFn: async () => {
      const response = await fetch(`/api/partners/${partnerId}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch partner users');
      }
      return response.json();
    },
    enabled: !!partnerId && activeTab === 'users',
  });

  // Fetch partner sites
  const {
    data: sites = [],
    isLoading: sitesLoading,
    isError: sitesError,
  } = useQuery({
    queryKey: ['/api/partners', partnerId, 'sites'],
    queryFn: async () => {
      const response = await fetch(`/api/partners/${partnerId}/sites`);
      if (!response.ok) {
        throw new Error('Failed to fetch partner sites');
      }
      return response.json();
    },
    enabled: !!partnerId && activeTab === 'sites',
  });

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render role badge
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'partner_admin':
        return <Badge className="bg-blue-500">Partner Admin</Badge>;
      case 'manager':
        return <Badge className="bg-purple-500">Manager</Badge>;
      case 'viewer':
        return <Badge variant="outline">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (partnerLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (partnerError || !partner) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Error</CardTitle>
              <CardDescription>Failed to load partner information</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p>There was an error loading the partner details. Please try again.</p>
          </CardContent>
          <Button onClick={() => navigate('/partners')} className="ml-4 mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Partners
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/partners')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">{partner.name}</h1>
        <div className="ml-4">{renderStatusBadge(partner.status)}</div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="sites" className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" /> Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Partner Information</CardTitle>
              <CardDescription>Details about the partner organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contact Email
                  </h3>
                  <p>{partner.contactEmail}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contact Phone
                  </h3>
                  <p>{partner.contactPhone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Address
                  </h3>
                  <p>{partner.address || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Created
                  </h3>
                  <p>
                    {partner.createdAt
                      ? new Date(partner.createdAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Description
                  </h3>
                  <p>{partner.description || 'No description available'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Users belonging to this partner organization
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  toast({
                    title: "Feature not implemented",
                    description: "Adding partner users functionality will be implemented in a future update."
                  });
                }}
              >
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : usersError ? (
                <div className="flex justify-center py-8 text-destructive">
                  <p>Error loading users. Please try again.</p>
                </div>
              ) : users.length === 0 ? (
                <div className="flex justify-center py-8 text-center">
                  <p className="text-muted-foreground">No users found for this partner</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{renderRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sites</CardTitle>
                <CardDescription>
                  Sites managed by this partner organization
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  toast({
                    title: "Feature not implemented",
                    description: "Adding partner sites functionality will be implemented in a future update."
                  });
                }}
              >
                Add Site
              </Button>
            </CardHeader>
            <CardContent>
              {sitesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sitesError ? (
                <div className="flex justify-center py-8 text-destructive">
                  <p>Error loading sites. Please try again.</p>
                </div>
              ) : sites.length === 0 ? (
                <div className="flex justify-center py-8 text-center">
                  <p className="text-muted-foreground">No sites found for this partner</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timezone</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((site: Site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>{site.address}</TableCell>
                        <TableCell>{renderStatusBadge(site.status)}</TableCell>
                        <TableCell>{site.timezone || 'N/A'}</TableCell>
                        <TableCell>
                          {site.createdAt
                            ? new Date(site.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}