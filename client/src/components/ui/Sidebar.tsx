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
  Users,
  MapPin,
  MessageSquare,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import Logo from '@/components/ui/Logo';

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
    { path: '/partners', label: 'Partners', icon: Users },
    { path: '/locations', label: 'Locations', icon: MapPin },
    { path: '/devices', label: 'Energy Assets', icon: Zap },
    { path: '/analytics', label: 'Analytics', icon: BarChart2 },
    { path: '/optimization', label: 'Optimization', icon: Lightbulb },
    { path: '/weather', label: 'Weather', icon: Cloud },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const bottomItems = [
    { path: '/events', label: 'Events', icon: MessageSquare },
    { path: '/support', label: 'Support', icon: Heart },
  ];

  const containerClasses = cn(
    'flex flex-col',
    isMobile
      ? 'fixed left-0 right-0 top-16 bottom-0 z-50 bg-white dark:bg-gray-800 overflow-y-auto'
      : 'hidden md:flex md:w-64 md:flex-col h-full'
  );

  return (
    <div className={containerClasses}>
      <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 pt-5 pb-4 overflow-y-auto border-r border-gray-100 dark:border-gray-700">
        <div className="flex items-center flex-shrink-0 px-6 mb-8">
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
        </div>
        
        <nav className="px-3 space-y-1 flex-1">
          {navItems.map((item) => (
            <div key={item.path} className="w-full mb-1">
              <Link
                href={item.path}
                onClick={() => onClose?.()}
              >
                <div
                  className={cn(
                    isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors'
                  )}
                >
                  <item.icon className={cn(
                    isActive(item.path)
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300',
                    'mr-3 h-4 w-4 flex-shrink-0'
                  )} />
                  {item.label}
                </div>
              </Link>
            </div>
          ))}
          
          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-700"></div>
          
          {bottomItems.map((item) => (
            <div key={item.path} className="w-full mb-1">
              <Link
                href={item.path}
                onClick={() => onClose?.()}
              >
                <div
                  className={cn(
                    isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors'
                  )}
                >
                  <item.icon className={cn(
                    isActive(item.path)
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300',
                    'mr-3 h-4 w-4 flex-shrink-0'
                  )} />
                  {item.label}
                </div>
              </Link>
            </div>
          ))}
        </nav>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="border border-gray-200 dark:border-gray-600">
                <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.username || 'Guest'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{user?.role || 'Not logged in'}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
