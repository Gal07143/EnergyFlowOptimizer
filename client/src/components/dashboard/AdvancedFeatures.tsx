import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OptimizationSettings } from '@/types/energy';
import { Plug, Landmark, Handshake } from 'lucide-react';
import { useUpdateOptimizationSettings } from '@/hooks/useOptimization';
import { Link } from "wouter";

interface AdvancedFeaturesProps {
  siteId: number;
  settings?: OptimizationSettings;
}

export default function AdvancedFeatures({ siteId, settings }: AdvancedFeaturesProps) {
  const { mutate: updateSettings } = useUpdateOptimizationSettings();

  const enableFeature = (feature: string) => {
    if (!settings) return;

    const updatedSettings: Partial<OptimizationSettings> = { ...settings };

    switch (feature) {
      case 'v2g':
        updatedSettings.v2gEnabled = !settings.v2gEnabled;
        break;
      case 'vpp':
        updatedSettings.vppEnabled = !settings.vppEnabled;
        break;
      case 'p2p':
        updatedSettings.p2pEnabled = !settings.p2pEnabled;
        break;
    }

    updateSettings({
      siteId,
      ...updatedSettings
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 mt-8 mb-8">
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Advanced Features</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500 dark:text-gray-400">
          Enable additional capabilities for your energy management system
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* V2G Feature Card */}
        <Card className="overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                <Plug className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">Bidirectional EV Charging</h3>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enable V2G/V2H capabilities to use your electric vehicle as a power source during peak hours or grid outages.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                New Feature
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-800">
            <Button 
              variant={settings?.v2gEnabled ? "default" : "outline"} 
              className="w-full"
              onClick={() => enableFeature('v2g')}
            >
              {settings?.v2gEnabled ? 'Enabled' : 'Enable Feature'}
            </Button>
          </div>
        </Card>

        {/* VPP Feature Card */}
        <Card className="overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <Landmark className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">Virtual Power Plant</h3>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Participate in grid services by joining a network of distributed energy resources to create a virtual power plant.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Earn Credits
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-800">
            {settings?.vppEnabled ? (
              <Link href="/vpp" className="w-full">
                <Button 
                  variant="default" 
                  className="w-full"
                >
                  Manage VPP
                </Button>
              </Link>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => enableFeature('vpp')}
              >
                Enable Feature
              </Button>
            )}
          </div>
        </Card>

        {/* P2P Energy Trading Card */}
        <Card className="overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                <Handshake className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">P2P Energy Trading</h3>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trade excess energy with neighbors in your community energy market. Share renewable energy and reduce costs.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Coming Soon
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-800">
            <Button 
              variant="outline" 
              className="w-full"
              disabled={!settings?.p2pEnabled}
            >
              Join Waitlist
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
