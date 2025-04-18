import React, { useState, useEffect } from 'react';

export default function DiagnosticPage() {
  const [apiStatus, setApiStatus] = useState<string>('Not tested');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [wsStatus, setWsStatus] = useState<string>('Not connected');
  const [wsMessages, setWsMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

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

  // Run test on component mount
  useEffect(() => {
    testApiHealth();
    // Don't auto-connect WebSocket to avoid unwanted connections
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">EMS Diagnostic Tools</h1>
      
      <div className="bg-white rounded shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">API Health Check</h2>
        <div className={`mb-2 ${apiStatus.includes('Connected') ? 'text-green-600 font-medium' : apiStatus.includes('Failed') ? 'text-red-600 font-medium' : ''}`}>
          Status: {apiStatus}
        </div>
        <button 
          onClick={testApiHealth}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-2"
        >
          Test API
        </button>
        <pre className="bg-gray-100 p-4 rounded">
          {apiResponse}
        </pre>
      </div>
      
      <div className="bg-white rounded shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">WebSocket Connection</h2>
        <div className={`mb-2 ${wsStatus.includes('Connected') ? 'text-green-600 font-medium' : wsStatus.includes('Disconnected') || wsStatus.includes('Error') || wsStatus.includes('Failed') ? 'text-red-600 font-medium' : ''}`}>
          Status: {wsStatus}
        </div>
        <div className="flex gap-2 mb-2">
          <button 
            onClick={connectWebSocket}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Connect
          </button>
          <button 
            onClick={disconnectWebSocket}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Disconnect
          </button>
          <button 
            onClick={sendPing}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Send Ping
          </button>
        </div>
        <div className="bg-gray-100 p-4 rounded h-48 overflow-y-auto">
          {wsMessages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>Browser Information: {navigator.userAgent}</p>
        <p>Current URL: {window.location.href}</p>
      </div>
    </div>
  );
}
