import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Zap,
  BarChart2,
  Lightbulb,
  Settings,
  BatteryCharging,
  PlugZap,
  Sun,
  Gauge,
  X,
  LogOut,
  Cloud,
  UserCog,
  MapPin,
  Router,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
    if (onClose) onClose();
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/devices', label: 'Devices', icon: Zap },
    { path: '/locations', label: 'Locations', icon: MapPin },
    { path: '/optimization', label: 'Optimization', icon: Lightbulb },
    { path: '/weather', label: 'Weather', icon: Cloud },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const deviceItems = [
    { path: '/devices/battery', label: 'Battery Storage', icon: BatteryCharging },
    { path: '/devices/ev', label: 'EV Chargers', icon: PlugZap },
    { path: '/devices/solar', label: 'Solar PV', icon: Sun },
    { path: '/devices/meter', label: 'Smart Meters', icon: Gauge },
    { path: '/gateways', label: 'Gateways', icon: Router },
  ];

  const containerClasses = cn(
    'flex flex-col',
    isMobile
      ? 'fixed left-0 right-0 top-16 bottom-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto'
      : 'hidden md:flex md:w-64 md:flex-col h-full'
  );

  return (
    <div className={containerClasses}>
      <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 pt-5 pb-4 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
        <div className="flex items-center flex-shrink-0 px-4 mb-5">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {!isMobile && (
            <span className="text-2xl font-bold text-primary dark:text-primary-foreground">
              EnergyEMS
            </span>
          )}
        </div>
        
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <div key={item.path} className="w-full">
              <Link
                href={item.path}
                onClick={() => onClose?.()}
              >
                <div
                  className={cn(
                    isActive(item.path)
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer'
                  )}
                >
                  <item.icon className={cn(
                    isActive(item.path)
                      ? 'text-primary-500 dark:text-primary-400'
                      : 'text-gray-400 dark:text-gray-500',
                    'mr-3 h-5 w-5'
                  )} />
                  {item.label}
                </div>
              </Link>
            </div>
          ))}
          
          <div className="pt-4 pb-2">
            <div className="border-t border-gray-200 dark:border-gray-800"></div>
          </div>
          
          <div className="px-2 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Device Management
            </span>
            
            {deviceItems.map((item) => (
              <div key={item.path} className="w-full">
                <Link
                  href={item.path}
                  onClick={() => onClose?.()}
                >
                  <div
                    className={cn(
                      isActive(item.path)
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer'
                    )}
                  >
                    <item.icon className={cn(
                      isActive(item.path)
                        ? 'text-primary-500 dark:text-primary-400'
                        : 'text-gray-400 dark:text-gray-500',
                      'mr-3 h-5 w-5'
                    )} />
                    {item.label}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </nav>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center justify-between">
            <Link href="/profile" onClick={() => onClose?.()}>
              <div className="flex items-center cursor-pointer hover:opacity-80">
                <Avatar>
                  <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.username || 'Guest'}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-500">{user?.role || 'Not logged in'}</p>
                </div>
              </div>
            </Link>
            <div className="flex">
              <Link href="/profile">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onClose?.()}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mr-1"
                >
                  <UserCog className="h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
