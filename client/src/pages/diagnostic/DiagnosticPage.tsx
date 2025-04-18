import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Activity, Zap, Layers, Server, Globe } from "lucide-react";

export default function DiagnosticPage() {
  const [apiStatus, setApiStatus] = useState<string>('Not tested');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [wsStatus, setWsStatus] = useState<string>('Not connected');
  const [wsMessages, setWsMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<{ [key: string]: { status: string, response: string } }>({
    '/api/health': { status: 'Not tested', response: '' },
    '/api/healthcheck': { status: 'Not tested', response: '' },
    '/api/devices': { status: 'Not tested', response: '' },
    '/api/sites': { status: 'Not tested', response: '' }
  });
  const [networkInfo, setNetworkInfo] = useState<{ online: boolean, type: string | null }>({
    online: navigator.onLine,
    type: null
  });

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setNetworkInfo(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetworkInfo(prev => ({ ...prev, online: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Try to get connection type if available
    if ('connection' in navigator && navigator.connection) {
      const conn = navigator.connection as any;
      setNetworkInfo(prev => ({ 
        ...prev, 
        type: conn.effectiveType || conn.type || 'unknown'
      }));
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function testApiHealth() {
    setApiStatus('Testing...');
    try {
      console.log('Fetching health endpoint');
      const response = await fetch('/api/health');
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      setApiStatus(`Connected (${response.status})`);
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('API health check error:', error);
      setApiStatus(`Failed (${error.message})`);
      setApiResponse(`Error: ${error.message}`);
    }
  }

  function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      addWsMessage('Already connected');
      return;
    }

    setWsStatus('Connecting...');
    try {
      // Determine the WebSocket URL based on the current page URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      addWsMessage(`Connecting to ${wsUrl}`);
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = (event) => {
        setWsStatus('Connected');
        addWsMessage('WebSocket connection established');
        console.log('WebSocket connected:', event);
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addWsMessage(`Received: ${JSON.stringify(data)}`);
          console.log('WebSocket message received:', data);
        } catch (error) {
          addWsMessage(`Received non-JSON message: ${event.data}`);
          console.log('WebSocket raw message:', event.data);
        }
      };
      
      newSocket.onclose = (event) => {
        setWsStatus(`Disconnected (code: ${event.code})`);
        addWsMessage(`Connection closed: ${event.code} - ${event.reason || 'No reason provided'}`);
        console.log('WebSocket closed:', event);
      };
      
      newSocket.onerror = (error) => {
        setWsStatus('Error');
        addWsMessage(`WebSocket error occurred`);
        console.error('WebSocket error:', error);
      };

      setSocket(newSocket);
    } catch (error: any) {
      setWsStatus(`Failed (${error.message})`);
      addWsMessage(`Error creating WebSocket: ${error.message}`);
      console.error('WebSocket creation error:', error);
    }
  }

  function disconnectWebSocket() {
    if (!socket) {
      addWsMessage('No active WebSocket connection');
      return;
    }
    
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'User initiated disconnect');
        addWsMessage('Closing WebSocket connection...');
      } else {
        addWsMessage(`Cannot close. WebSocket is in state: ${getReadyStateString(socket.readyState)}`);
      }
    } catch (error: any) {
      addWsMessage(`Error closing WebSocket: ${error.message}`);
      console.error('WebSocket close error:', error);
    }
  }

  function sendPing() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addWsMessage('Cannot send ping: WebSocket not connected');
      return;
    }
    
    try {
      const pingMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      socket.send(JSON.stringify(pingMessage));
      addWsMessage(`Sent: ${JSON.stringify(pingMessage)}`);
    } catch (error: any) {
      addWsMessage(`Error sending ping: ${error.message}`);
      console.error('WebSocket send error:', error);
    }
  }

  function addWsMessage(message: string) {
    setWsMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }

  function getReadyStateString(state: number): string {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING (0)';
      case WebSocket.OPEN: return 'OPEN (1)';
      case WebSocket.CLOSING: return 'CLOSING (2)';
      case WebSocket.CLOSED: return 'CLOSED (3)';
      default: return `UNKNOWN (${state})`;
    }
  }

  // Test multiple endpoints
  async function testAllEndpoints() {
    const endpoints = Object.keys(apiEndpoints);
    for (const endpoint of endpoints) {
      testEndpoint(endpoint);
    }
  }
  
  // Test a specific endpoint
  async function testEndpoint(endpoint: string) {
    setApiEndpoints(prev => ({
      ...prev,
      [endpoint]: { ...prev[endpoint], status: 'Testing...' }
    }));
    
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      const response = await fetch(endpoint);
      console.log(`Response status for ${endpoint}:`, response.status);
      
      let data;
      let responseText = '';
      
      try {
        data = await response.json();
        responseText = JSON.stringify(data, null, 2);
        console.log(`Response data for ${endpoint}:`, data);
      } catch (parseError) {
        responseText = 'Failed to parse JSON response';
        console.error(`Parse error for ${endpoint}:`, parseError);
      }
      
      setApiEndpoints(prev => ({
        ...prev,
        [endpoint]: { 
          status: `Connected (${response.status})`, 
          response: responseText
        }
      }));
    } catch (error: any) {
      console.error(`API error for ${endpoint}:`, error);
      setApiEndpoints(prev => ({
        ...prev,
        [endpoint]: { 
          status: `Failed (${error.message})`, 
          response: `Error: ${error.message}`
        }
      }));
    }
  }

  // Send a subscription to a site
  function sendSiteSubscription() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addWsMessage('Cannot subscribe: WebSocket not connected');
      return;
    }
    
    try {
      const subscriptionMessage = {
        type: 'subscribe',
        siteId: 1
      };
      
      socket.send(JSON.stringify(subscriptionMessage));
      addWsMessage(`Sent site subscription: ${JSON.stringify(subscriptionMessage)}`);
    } catch (error: any) {
      addWsMessage(`Error sending subscription: ${error.message}`);
      console.error('WebSocket subscription error:', error);
    }
  }

  // Run tests on component mount
  useEffect(() => {
    testApiHealth();
    testAllEndpoints();
    // Don't auto-connect WebSocket to avoid unwanted connections
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">EMS Diagnostic Dashboard</h1>
        <Badge 
          variant={networkInfo.online ? "success" : "destructive"}
          className="text-md py-1 px-3"
        >
          {networkInfo.online ? '🟢 Online' : '🔴 Offline'} 
          {networkInfo.type && ` (${networkInfo.type})`}
        </Badge>
      </div>
      
      <Tabs defaultValue="api">
        <TabsList className="mb-4">
          <TabsTrigger value="api">
            <Server className="mr-2 h-4 w-4" />
            API Health
          </TabsTrigger>
          <TabsTrigger value="websocket">
            <Zap className="mr-2 h-4 w-4" />
            WebSocket
          </TabsTrigger>
          <TabsTrigger value="endpoints">
            <Layers className="mr-2 h-4 w-4" />
            API Endpoints
          </TabsTrigger>
          <TabsTrigger value="system">
            <Globe className="mr-2 h-4 w-4" />
            System Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Health Check</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`mb-4 text-lg ${apiStatus.includes('Connected') ? 'text-green-600 font-medium' : apiStatus.includes('Failed') ? 'text-red-600 font-medium' : ''}`}>
                Status: {apiStatus}
              </div>
              <Button 
                onClick={testApiHealth}
                className="mb-4"
              >
                Test API Health
              </Button>
              <pre className="bg-gray-100 p-4 rounded text-sm h-56 overflow-auto">
                {apiResponse}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="websocket" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Connection Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`mb-4 text-lg ${wsStatus.includes('Connected') ? 'text-green-600 font-medium' : wsStatus.includes('Disconnected') || wsStatus.includes('Error') || wsStatus.includes('Failed') ? 'text-red-600 font-medium' : ''}`}>
                Status: {wsStatus}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button onClick={connectWebSocket}>
                  Connect
                </Button>
                <Button 
                  onClick={disconnectWebSocket}
                  variant="destructive"
                >
                  Disconnect
                </Button>
                <Button 
                  onClick={sendPing}
                  variant="outline"
                >
                  Send Ping
                </Button>
                <Button 
                  onClick={sendSiteSubscription}
                  variant="outline"
                >
                  Subscribe to Site
                </Button>
              </div>
              <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto">
                {wsMessages.map((msg, i) => (
                  <div key={i} className="text-sm font-mono mb-1">{msg}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>API Endpoints</span>
                <Button 
                  onClick={testAllEndpoints}
                  variant="outline"
                  size="sm"
                >
                  Test All Endpoints
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiEndpoints).map(([endpoint, data]) => (
                  <div key={endpoint} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{endpoint}</h3>
                      <Badge 
                        variant={
                          data.status.includes('Connected') ? "success" : 
                          data.status.includes('Failed') ? "destructive" : 
                          "outline"
                        }
                      >
                        {data.status}
                      </Badge>
                    </div>
                    <div className="flex justify-end mb-2">
                      <Button 
                        onClick={() => testEndpoint(endpoint)}
                        variant="outline"
                        size="sm"
                      >
                        Test
                      </Button>
                    </div>
                    <pre className="bg-gray-100 p-3 rounded text-xs max-h-40 overflow-auto">
                      {data.response || 'No response data'}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Browser Information</h3>
                  <p className="text-sm text-gray-700">{navigator.userAgent}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1">Network Status</h3>
                  <p className="text-sm text-gray-700">
                    Status: {networkInfo.online ? 'Online' : 'Offline'}<br />
                    Connection Type: {networkInfo.type || 'Unknown'}
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1">Current URL</h3>
                  <p className="text-sm text-gray-700 break-all">{window.location.href}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1">Server URL</h3>
                  <p className="text-sm text-gray-700 break-all">{window.location.origin}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1">WebSocket URL</h3>
                  <p className="text-sm text-gray-700 break-all">
                    {window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//{window.location.host}/ws
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1">Date & Time</h3>
                  <p className="text-sm text-gray-700">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
