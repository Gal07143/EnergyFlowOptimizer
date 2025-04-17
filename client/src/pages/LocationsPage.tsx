import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSiteContext } from '@/hooks/use-site-context';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Loader2, Plus, MapPin, Building, Home, Factory, ChevronRight, Edit, Trash, MoreVertical, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Site } from '@/hooks/use-site-context';

export default function LocationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [showEditSiteDialog, setShowEditSiteDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const { sites, currentSiteId, setCurrentSiteId, isLoading } = useSiteContext();
  const { toast } = useToast();

  // Filter sites based on search term and active tab
  const filteredSites = sites.filter((site) => {
    // Filter by search term
    const matchesSearch = 
      !searchTerm || 
      site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.siteType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by site type tab
    const matchesType = 
      activeTab === 'all' || 
      (activeTab === 'residential' && site.siteType?.includes('residential')) ||
      (activeTab === 'commercial' && site.siteType?.includes('commercial')) ||
      (activeTab === 'industrial' && site.siteType?.includes('industrial')) ||
      (activeTab === 'other' && !['residential', 'commercial', 'industrial'].some(t => site.siteType?.includes(t)));
      
    return matchesSearch && matchesType;
  });

  // New site form state
  const [newSite, setNewSite] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    timezone: 'UTC',
    siteType: 'residential',
    installedCapacity: '',
    status: 'active'
  });

  // Edit site form state - initialize with current site data when editing
  const [editSite, setEditSite] = useState({
    id: 0,
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    timezone: '',
    siteType: '',
    installedCapacity: '',
    status: ''
  });

  // Handle add site form input change
  const handleNewSiteChange = (field: string, value: string) => {
    setNewSite({
      ...newSite,
      [field]: value
    });
  };

  // Handle edit site form input change
  const handleEditSiteChange = (field: string, value: string) => {
    setEditSite({
      ...editSite,
      [field]: value
    });
  };

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: async (siteData: any) => {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData)
      });
      if (!response.ok) {
        throw new Error('Failed to create site');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
      setShowAddSiteDialog(false);
      toast({
        title: 'Site Created',
        description: `Site "${newSite.name}" has been successfully created.`,
        variant: 'default',
      });
      // Reset form
      setNewSite({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        timezone: 'UTC',
        siteType: 'residential',
        installedCapacity: '',
        status: 'active'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Site',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Update site mutation
  const updateSiteMutation = useMutation({
    mutationFn: async (siteData: any) => {
      const response = await fetch(`/api/sites/${siteData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData)
      });
      if (!response.ok) {
        throw new Error('Failed to update site');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
      setShowEditSiteDialog(false);
      toast({
        title: 'Site Updated',
        description: `Site "${editSite.name}" has been successfully updated.`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Site',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete site mutation
  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: number) => {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete site');
      }
      return response.json();
    },
    onSuccess: (_, siteId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
      toast({
        title: 'Site Deleted',
        description: 'The site has been successfully deleted.',
        variant: 'default',
      });
      // If current site was deleted, switch to another site
      if (currentSiteId === siteId && sites.length > 1) {
        const nextSite = sites.find(site => site.id !== siteId);
        if (nextSite) {
          setCurrentSiteId(nextSite.id);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Site',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Handle add site form submission
  const handleAddSite = () => {
    // Basic validation
    if (!newSite.name || !newSite.address) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Process numeric values
    const siteData = {
      ...newSite,
      latitude: newSite.latitude ? parseFloat(newSite.latitude) : undefined,
      longitude: newSite.longitude ? parseFloat(newSite.longitude) : undefined,
      installedCapacity: newSite.installedCapacity ? parseFloat(newSite.installedCapacity) : undefined
    };

    createSiteMutation.mutate(siteData);
  };

  // Handle edit site form submission
  const handleUpdateSite = () => {
    // Basic validation
    if (!editSite.name || !editSite.address) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Process numeric values
    const siteData = {
      ...editSite,
      latitude: editSite.latitude ? parseFloat(editSite.latitude) : undefined,
      longitude: editSite.longitude ? parseFloat(editSite.longitude) : undefined,
      installedCapacity: editSite.installedCapacity ? parseFloat(editSite.installedCapacity) : undefined
    };

    updateSiteMutation.mutate(siteData);
  };

  // Handle delete site
  const handleDeleteSite = (site: Site) => {
    if (confirm(`Are you sure you want to delete "${site.name}"? This will also delete all associated devices and data.`)) {
      deleteSiteMutation.mutate(site.id);
    }
  };

  // Open edit dialog with site data
  const openEditSiteDialog = (site: Site) => {
    setEditSite({
      id: site.id,
      name: site.name,
      address: site.address,
      latitude: site.latitude?.toString() || '',
      longitude: site.longitude?.toString() || '',
      timezone: site.timezone || 'UTC',
      siteType: site.siteType || 'residential',
      installedCapacity: site.installedCapacity?.toString() || '',
      status: site.status || 'active'
    });
    setShowEditSiteDialog(true);
  };

  // Get site icon based on type
  const getSiteIcon = (type?: string) => {
    if (!type) return <Building className="h-5 w-5 text-gray-500" />;
    
    if (type.includes('residential')) return <Home className="h-5 w-5 text-green-500" />;
    if (type.includes('commercial')) return <Building className="h-5 w-5 text-blue-500" />;
    if (type.includes('industrial')) return <Factory className="h-5 w-5 text-orange-500" />;
    
    return <Building className="h-5 w-5 text-gray-500" />;
  };

  // Get status badge
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let statusDisplay = status;
    
    if (['active', 'online', 'connected'].includes(status.toLowerCase())) {
      variant = 'default';
      statusDisplay = 'Active';
    } else if (['inactive', 'offline', 'disconnected'].includes(status.toLowerCase())) {
      variant = 'destructive';
      statusDisplay = 'Inactive';
    } else if (['pending', 'standby'].includes(status.toLowerCase())) {
      variant = 'secondary';
      statusDisplay = 'Pending';
    }
    
    return <Badge variant={variant}>{statusDisplay}</Badge>;
  };

  return (
    <div className="container py-6 px-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Locations</h1>
            <p className="text-muted-foreground">Manage your sites and energy assets</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/sites'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddSiteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>
        
        {/* Filtering and search */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Input 
              placeholder="Search by name, address, or type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
        
        {/* Site type tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="residential">Residential</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
            <TabsTrigger value="industrial">Industrial</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Site cards */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        ) : filteredSites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Locations Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No locations match your search criteria.' : 'You haven\'t added any locations yet.'}
              </p>
              <Button onClick={() => setShowAddSiteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map((site) => (
              <Card 
                key={site.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${site.id === currentSiteId ? 'border-primary bg-muted/20' : ''}`}
                onClick={() => setCurrentSiteId(site.id)}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center space-x-2">
                    {getSiteIcon(site.siteType)}
                    <div>
                      <CardTitle className="text-base">{site.name}</CardTitle>
                      <CardDescription>{site.siteType || 'Location'}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(site.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditSiteDialog(site); }}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSite(site); }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Address: </span>
                      <span>{site.address}</span>
                    </div>
                    {site.installedCapacity && (
                      <div>
                        <span className="text-muted-foreground">Capacity: </span>
                        <span>{site.installedCapacity} kW</span>
                      </div>
                    )}
                    {site.timezone && (
                      <div>
                        <span className="text-muted-foreground">Timezone: </span>
                        <span>{site.timezone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="w-full">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      View Details <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Add site dialog */}
        <Dialog open={showAddSiteDialog} onOpenChange={setShowAddSiteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>
                Enter the details of the location you would like to add.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="site-name">Location Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="site-name" 
                  placeholder="Enter location name" 
                  value={newSite.name}
                  onChange={(e) => handleNewSiteChange('name', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site-address">Address <span className="text-destructive">*</span></Label>
                <Input 
                  id="site-address" 
                  placeholder="Enter address" 
                  value={newSite.address}
                  onChange={(e) => handleNewSiteChange('address', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site-type">Site Type</Label>
                <Select 
                  value={newSite.siteType}
                  onValueChange={(value) => handleNewSiteChange('siteType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="site-latitude">Latitude</Label>
                  <Input 
                    id="site-latitude" 
                    placeholder="e.g. 32.0853" 
                    value={newSite.latitude}
                    onChange={(e) => handleNewSiteChange('latitude', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="site-longitude">Longitude</Label>
                  <Input 
                    id="site-longitude" 
                    placeholder="e.g. 34.7818" 
                    value={newSite.longitude}
                    onChange={(e) => handleNewSiteChange('longitude', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site-timezone">Timezone</Label>
                <Select 
                  value={newSite.timezone}
                  onValueChange={(value) => handleNewSiteChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Asia/Jerusalem">Israel (Asia/Jerusalem)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="America/New_York">New York (ET)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Los Angeles (PT)</SelectItem>
                    <SelectItem value="Europe/Paris">Central Europe (CET/CEST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site-capacity">Installed Capacity (kW)</Label>
                <Input 
                  id="site-capacity" 
                  type="number" 
                  min="0" 
                  step="0.1" 
                  placeholder="Total installed capacity" 
                  value={newSite.installedCapacity}
                  onChange={(e) => handleNewSiteChange('installedCapacity', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site-status" className="flex items-center justify-between">
                  <span>Active</span>
                  <Switch 
                    checked={newSite.status === 'active'} 
                    onCheckedChange={(checked) => handleNewSiteChange('status', checked ? 'active' : 'inactive')}
                  />
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSiteDialog(false)}>Cancel</Button>
              <Button onClick={handleAddSite} disabled={createSiteMutation.isPending}>
                {createSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit site dialog */}
        <Dialog open={showEditSiteDialog} onOpenChange={setShowEditSiteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Update the details of this location.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-site-name">Location Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="edit-site-name" 
                  placeholder="Enter location name" 
                  value={editSite.name}
                  onChange={(e) => handleEditSiteChange('name', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-site-address">Address <span className="text-destructive">*</span></Label>
                <Input 
                  id="edit-site-address" 
                  placeholder="Enter address" 
                  value={editSite.address}
                  onChange={(e) => handleEditSiteChange('address', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-site-type">Site Type</Label>
                <Select 
                  value={editSite.siteType}
                  onValueChange={(value) => handleEditSiteChange('siteType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-site-latitude">Latitude</Label>
                  <Input 
                    id="edit-site-latitude" 
                    placeholder="e.g. 32.0853" 
                    value={editSite.latitude}
                    onChange={(e) => handleEditSiteChange('latitude', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-site-longitude">Longitude</Label>
                  <Input 
                    id="edit-site-longitude" 
                    placeholder="e.g. 34.7818" 
                    value={editSite.longitude}
                    onChange={(e) => handleEditSiteChange('longitude', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-site-timezone">Timezone</Label>
                <Select 
                  value={editSite.timezone}
                  onValueChange={(value) => handleEditSiteChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Asia/Jerusalem">Israel (Asia/Jerusalem)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="America/New_York">New York (ET)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Los Angeles (PT)</SelectItem>
                    <SelectItem value="Europe/Paris">Central Europe (CET/CEST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-site-capacity">Installed Capacity (kW)</Label>
                <Input 
                  id="edit-site-capacity" 
                  type="number" 
                  min="0" 
                  step="0.1" 
                  placeholder="Total installed capacity" 
                  value={editSite.installedCapacity}
                  onChange={(e) => handleEditSiteChange('installedCapacity', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-site-status" className="flex items-center justify-between">
                  <span>Active</span>
                  <Switch 
                    checked={editSite.status === 'active'} 
                    onCheckedChange={(checked) => handleEditSiteChange('status', checked ? 'active' : 'inactive')}
                  />
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditSiteDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateSite} disabled={updateSiteMutation.isPending}>
                {updateSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}