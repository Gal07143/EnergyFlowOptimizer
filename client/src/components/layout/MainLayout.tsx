import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Zap, 
  Battery, 
  Plug, 
  Activity, 
  BarChart2, 
  Settings, 
  PlugZap, 
  Thermometer,
  Sun,
  Users,
  Bell,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Menu,
  MapPin,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useSiteContext } from '@/hooks/use-site-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define badge type to fix type errors
type BadgeType = { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null;

// Define sidebar navigation items
const navItems = [
  {
    title: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: '/',
    badge: null as BadgeType
  },
  {
    title: 'Energy Flow',
    icon: <Activity className="h-5 w-5" />,
    href: '/energy-flow',
    badge: null as BadgeType
  },
  {
    title: 'Locations',
    icon: <MapPin className="h-5 w-5" />,
    href: '/locations',
    badge: null as BadgeType
  },
  {
    title: 'Weather',
    icon: <Sun className="h-5 w-5" />,
    href: '/weather',
    badge: null as BadgeType
  },
  {
    title: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
    badge: null as BadgeType
  },
  {
    title: 'Partners',
    icon: <Users className="h-5 w-5" />,
    href: '/partners',
    badge: null as BadgeType
  }
];

// Device Management
const deviceItems = [
  {
    title: 'All Devices',
    icon: <Plug className="h-5 w-5" />,
    href: '/devices',
    badge: null as BadgeType
  },
  {
    title: 'Device Registry',
    icon: <Settings className="h-5 w-5" />,
    href: '/device-registry',
    badge: null as BadgeType
  },
  {
    title: 'Gateways',
    icon: <PlugZap className="h-5 w-5" />,
    href: '/gateways',
    badge: null as BadgeType
  },
  {
    title: 'Electrical Diagrams',
    icon: <Activity className="h-5 w-5" />,
    href: '/electrical-diagrams',
    badge: null as BadgeType
  },
  {
    title: 'One-Line Diagram',
    icon: <PlugZap className="h-5 w-5" />,
    href: '/one-line-diagram',
    badge: null as BadgeType
  },
  {
    title: 'Battery Storage',
    icon: <Battery className="h-5 w-5" />,
    href: '/devices?type=battery',
    badge: null as BadgeType
  },
  {
    title: 'EV Chargers',
    icon: <PlugZap className="h-5 w-5" />,
    href: '/devices?type=ev',
    badge: null as BadgeType
  },
  {
    title: 'Solar PV',
    icon: <Sun className="h-5 w-5" />,
    href: '/devices?type=solar',
    badge: null as BadgeType
  },
  {
    title: 'Smart Meters',
    icon: <Activity className="h-5 w-5" />,
    href: '/devices?type=meter',
    badge: null as BadgeType
  }
];

// Energy Management Section
const energyItems = [
  {
    title: 'Energy Optimization',
    icon: <Zap className="h-5 w-5" />,
    href: '/optimization',
    badge: null as BadgeType
  },
  {
    title: 'VPP Programs',
    icon: <PlugZap className="h-5 w-5" />,
    href: '/vpp',
    badge: { text: '3', variant: 'outline' as const } as BadgeType
  },
  {
    title: 'Battery Arbitrage',
    icon: <Battery className="h-5 w-5" />,
    href: '/battery-arbitrage',
    badge: { text: 'New', variant: 'default' as const } as BadgeType
  },
  {
    title: 'Predictive Maintenance',
    icon: <Wrench className="h-5 w-5" />,
    href: '/predictive-maintenance',
    badge: { text: 'New', variant: 'default' as const } as BadgeType
  },
  {
    title: 'Demand Response',
    icon: <BarChart2 className="h-5 w-5" />,
    href: '/demand-response',
    badge: { text: 'Active', variant: 'default' as const } as BadgeType
  }
];

// Site data comes from the SiteContext

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { currentSiteId, setCurrentSiteId, sites, currentSite } = useSiteContext();

  // Handle site change
  const handleSiteChange = (siteId: string) => {
    setCurrentSiteId(parseInt(siteId));
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Generate user initials for avatar fallback
  const getInitials = () => {
    if (!user || !user.username) return 'U';
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out md:relative md:translate-x-0",
          collapsed ? "w-[70px]" : "w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between px-4 py-4">
          <div className="flex items-center">
            <div className="rounded-md bg-gradient-to-r from-primary/80 to-primary p-1.5 shadow-md">
              <Zap className="h-7 w-7 text-white" />
            </div>
            {!collapsed && (
              <div className="ml-3 flex flex-col">
                <span className="text-xl font-bold tracking-tight">EnergyEMS</span>
                <span className="text-xs text-muted-foreground">Smart Energy Management</span>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex hover:bg-primary/10 transition-colors" 
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Site selector */}
        {!collapsed ? (
          <div className="px-4 py-2">
            <Select
              value={currentSiteId?.toString() || "1"}
              onValueChange={handleSiteChange}
            >
              <SelectTrigger className="w-full bg-muted/50">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites && sites.map(site => (
                  <SelectItem key={site.id} value={site.id.toString()}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Current Site: {currentSite?.name || 'Home'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-primary/90 to-primary text-white shadow-md" 
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {collapsed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-md",
                                isActive ? "bg-white/20" : "bg-transparent"
                              )}>
                                {item.icon}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md",
                            isActive ? "bg-white/20" : "bg-primary/10"
                          )}>
                            {item.icon}
                          </div>
                          <span className="ml-3 font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "outline" : item.badge.variant}
                              className={cn(
                                "ml-auto",
                                isActive && "bg-white/20 text-white hover:bg-white/30"
                              )}
                            >
                              {item.badge.text}
                            </Badge>
                          )}
                        </>
                      )}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Device Management Section */}
          {!collapsed && (
            <div className="mt-6 px-3">
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                DEVICE MANAGEMENT
              </h3>
            </div>
          )}
          <ul className="space-y-1 px-2">
            {deviceItems.map((item) => {
              const isActive = location === item.href || 
                (item.href.includes('?type=') && location.startsWith('/devices') && 
                location.includes(item.href.split('?type=')[1]));
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-primary/90 to-primary text-white shadow-md" 
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {collapsed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-md",
                                isActive ? "bg-white/20" : "bg-transparent"
                              )}>
                                {item.icon}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md",
                            isActive ? "bg-white/20" : "bg-primary/10"
                          )}>
                            {item.icon}
                          </div>
                          <span className="ml-3 font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "outline" : item.badge.variant}
                              className={cn(
                                "ml-auto",
                                isActive && "bg-white/20 text-white hover:bg-white/30"
                              )}
                            >
                              {item.badge.text}
                            </Badge>
                          )}
                        </>
                      )}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Energy Management Section */}
          {!collapsed && (
            <div className="mt-6 px-3">
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                ENERGY MANAGEMENT
              </h3>
            </div>
          )}
          <ul className="space-y-1 px-2">
            {energyItems.map((item) => {
              const isActive = location === item.href;
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-primary/90 to-primary text-white shadow-md" 
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {collapsed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-md",
                                isActive ? "bg-white/20" : "bg-transparent"
                              )}>
                                {item.icon}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md",
                            isActive ? "bg-white/20" : "bg-primary/10"
                          )}>
                            {item.icon}
                          </div>
                          <span className="ml-3 font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "outline" : item.badge.variant}
                              className={cn(
                                "ml-auto",
                                isActive && "bg-white/20 text-white hover:bg-white/30"
                              )}
                            >
                              {item.badge.text}
                            </Badge>
                          )}
                        </>
                      )}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User menu */}
        <div className="border-t px-4 py-4">
          {collapsed ? (
            <div className="flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer">
                      <AvatarImage src="/avatar.png" alt="User" />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {user?.username || 'User'} • Account Settings
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex cursor-pointer items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/avatar.png" alt="User" />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{user?.username || 'User'}</p>
                    <p className="text-xs text-muted-foreground">Administrator</p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <a className="cursor-pointer">Profile Settings</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notifications">
                    <a className="cursor-pointer">Notifications</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive" 
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold md:block">
              {navItems.find(item => item.href === location)?.title || 
               deviceItems.find(item => item.href === location)?.title || 
               energyItems.find(item => item.href === location)?.title ||
               (location.startsWith('/electrical-diagrams/') ? 'Electrical Diagram' : 
                location === '/one-line-diagram' ? 'One-Line Diagram' : 
                location === '/battery-arbitrage' ? 'Battery Arbitrage' :
                location === '/predictive-maintenance' ? 'Predictive Maintenance' : 'Dashboard')}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"></span>
                    <span className="sr-only">Notifications</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>3 new notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background/50 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}