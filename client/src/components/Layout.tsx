import { useState, useEffect } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useSiteSelector } from '@/hooks/useSiteData';
import { User, Bell, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentSite, sites, changeSite } = useSiteSelector();
  const isMobile = useMobile();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when window resizes to desktop
  useEffect(() => {
    if (!isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, mobileMenuOpen]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      {!isMobile && <Sidebar />}

      {/* Mobile Navigation */}
      {isMobile && (
        <div className="bg-white dark:bg-dark-100 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <span className="text-xl font-bold text-primary dark:text-primary-foreground">EnergyEMS</span>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={toggleMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          {/* Mobile menu, show/hide based on menu state */}
          {mobileMenuOpen && <Sidebar isMobile onClose={() => setMobileMenuOpen(false)} />}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        {!isMobile && (
          <div className="bg-white dark:bg-dark-100 shadow-sm z-10 flex h-16 border-b border-gray-200 dark:border-gray-800">
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex items-center">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {currentSite?.name || 'Dashboard'}
                </h1>
              </div>
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
                <ThemeToggle />
                <div className="border-l border-gray-200 dark:border-gray-800 h-6 mx-1"></div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center">
                      <span>{currentSite?.name || 'Select Site'}</span>
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Select Site</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sites?.map((site) => (
                      <DropdownMenuItem 
                        key={site.id} 
                        onClick={() => changeSite(site.id)}
                        className={site.id === currentSite?.id ? 'bg-primary/10' : ''}
                      >
                        {site.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pt-16 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
