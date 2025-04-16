import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sun, Wind, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostBalanceWidgetProps {
  siteId: number;
  className?: string;
}

const CostBalanceWidget: React.FC<CostBalanceWidgetProps> = ({ siteId, className }) => {
  const [activeTab, setActiveTab] = React.useState('account');

  // Fetch cost data
  const { data: costData, isLoading } = useQuery({
    queryKey: ['/api/sites', siteId, 'balance'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/energy/balance`);
      if (!res.ok) throw new Error('Failed to fetch energy balance data');
      return await res.json();
    },
    enabled: !!siteId,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-36" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Parse the cost data or use defaults
  const savingsAmount = costData?.savings || 24.70;
  const earningsAmount = costData?.earnings || 0.70;
  const costsAmount = costData?.costs || 10.00;
  const potentialSavings = costData?.potentialSavings || 0.30;
  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle>Your system cost balance</CardTitle>
        <CardDescription>
          Today your cost: <span className="font-semibold">0.15 €/kWh</span>
        </CardDescription>
        <CardDescription className="mt-1">
          Without your home energy management system you would have paid:
          <span className="font-semibold ml-1">0.30 €/kWh</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <h4 className="text-xs font-medium mb-1">Savings</h4>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{savingsAmount} €</p>
            <p className="text-xs text-muted-foreground">Avoided costs through smart system management</p>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded-full">
                <Sun className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
            <h4 className="text-xs font-medium mb-1">Earnings</h4>
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{earningsAmount} €</p>
            <p className="text-xs text-muted-foreground">From grid feed-in and flexibilities</p>
          </div>
          
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="bg-red-100 dark:bg-red-800/30 p-2 rounded-full">
                <Wind className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <h4 className="text-xs font-medium mb-1">Costs</h4>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{costsAmount} €</p>
            <p className="text-xs text-muted-foreground">From grid consumption</p>
          </div>
        </div>
        
        <div className="mt-6 border-t pt-4">
          <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="pt-4">
              <p className="text-sm text-center font-medium text-muted-foreground">
                {todayDate}
              </p>
            </TabsContent>
            
            <TabsContent value="yesterday" className="pt-4">
              <p className="text-sm text-center font-medium text-muted-foreground">
                Previous day balance: -{formatNumber(costsAmount - earningsAmount, 2)} €
              </p>
            </TabsContent>
            
            <TabsContent value="team" className="pt-4">
              <p className="text-sm text-center font-medium text-muted-foreground">
                Team savings: {formatNumber(savingsAmount * 1.2, 2)} €
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Smart steering of your assets
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostBalanceWidget;