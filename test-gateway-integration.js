/**
 * Gateway Integration Test for Energy Management System
 * 
 * This script tests both HTTP API and WebSocket connectivity for gateway integration,
 * simulating a gateway device connecting to the EMS server.
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const config = {
  emsServerUrl: 'http://localhost:5000',
  wsUrl: 'ws://localhost:5000/ws',
  gatewayId: 'test-gateway-' + uuidv4().substring(0, 8),
  testDurationMs: 20000 // 20 seconds
};

// Test results
const results = {
  api: {
    endpoints: {},
    successful: 0,
    failed: 0,
    total: 0
  },
  websocket: {
    connected: false,
    pingsSent: 0,
    responsesReceived: 0,
    errors: 0
  }
};

// Global state
let ws = null;
let testInterval = null;

/**
 * Test API endpoint
 */
async function testApiEndpoint(endpoint) {
  const { url, method, name, body = null } = endpoint;
  const fullUrl = `${config.emsServerUrl}${url}`;
  
  console.log(`\n----- Testing ${name} (${method} ${url}) -----`);
  results.api.total++;
  
  try {
    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const startTime = Date.now();
    const response = await fetch(fullUrl, options);
    const responseTime = Date.now() - startTime;
    
    let responseData = null;
    let responseText = '<empty>';
    
    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        responseData = await response.json();
        responseText = JSON.stringify(responseData, null, 2).substring(0, 100);
        if (responseText.length >= 100) responseText += '...';
      } else {
        responseText = await response.text();
        if (responseText.length > 100) responseText = responseText.substring(0, 100) + '...';
      }
    } catch (parseError) {
      responseText = `<Error parsing response: ${parseError.message}>`;
    }
    
    // Record result
    const isSuccess = response.status >= 200 && response.status < 400;
    if (isSuccess) results.api.successful++;
    else results.api.failed++;
    
    results.api.endpoints[url] = {
      success: isSuccess,
      status: response.status,
      responseTime,
      contentType: response.headers.get('content-type'),
      responsePreview: responseText
    };
    
    // Log result
    if (isSuccess) {
      console.log(`  ✓ Success: ${response.status} (${responseTime}ms)`);
      console.log(`  Response: ${responseText}`);
    } else {
      console.log(`  ✗ Failed: ${response.status} (${responseTime}ms)`);
      console.log(`  Response: ${responseText}`);
    }
    
    return responseData;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    results.api.failed++;
    results.api.endpoints[url] = {
      success: false,
      error: error.message
    };
    return null;
  }
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  console.log(`\n===== CONNECTING TO WEBSOCKET SERVER =====`);
  console.log(`URL: ${config.wsUrl}`);
  
  try {
    ws = new WebSocket(config.wsUrl);
    
    ws.on('open', () => {
      console.log(`✓ Successfully connected to WebSocket server`);
      results.websocket.connected = true;
      
      // Subscribe to a site
      sendSubscription(1);
      
      // Start sending pings
      testInterval = setInterval(() => {
        sendWsPing();
      }, 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`← Received WebSocket message: ${JSON.stringify(message)}`);
        results.websocket.responsesReceived++;
        
        // Process specific message types
        if (message.type === 'subscribed') {
          console.log(`  ✓ Subscription confirmed for ${message.siteId ? 'site ' + message.siteId : 'device ' + message.deviceId}`);
        }
      } catch (error) {
        console.error(`Failed to parse message: ${error.message}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`✗ WebSocket error: ${error.message}`);
      results.websocket.errors++;
    });
    
    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed (code: ${code}, reason: ${reason || 'No reason provided'})`);
      results.websocket.connected = false;
      clearInterval(testInterval);
    });
    
  } catch (error) {
    console.error(`Failed to setup WebSocket connection: ${error.message}`);
    results.websocket.errors++;
  }
}

/**
 * Send WebSocket ping
 */
function sendWsPing() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error(`Cannot send ping: WebSocket not connected`);
    return;
  }
  
  try {
    const pingMessage = {
      type: 'ping',
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(pingMessage));
    console.log(`→ Sent WebSocket ping`);
    results.websocket.pingsSent++;
  } catch (error) {
    console.error(`Error sending ping: ${error.message}`);
    results.websocket.errors++;
  }
}

/**
 * Subscribe to site or device events
 */
function sendSubscription(siteId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error(`Cannot subscribe: WebSocket not connected`);
    return;
  }
  
  try {
    const subscriptionMessage = {
      type: 'subscribe',
      siteId: siteId
    };
    
    ws.send(JSON.stringify(subscriptionMessage));
    console.log(`→ Sent subscription for site ${siteId}`);
  } catch (error) {
    console.error(`Error sending subscription: ${error.message}`);
    results.websocket.errors++;
  }
}

/**
 * Display test results summary
 */
function displaySummary() {
  console.log('\n\n=========== GATEWAY INTEGRATION TEST RESULTS ===========');
  
  console.log('HTTP API CONNECTIVITY:');
  console.log(`Total Endpoints Tested: ${results.api.total}`);
  console.log(`Successful: ${results.api.successful}`);
  console.log(`Failed: ${results.api.failed}`);
  console.log(`Success Rate: ${results.api.total > 0 ? Math.round((results.api.successful / results.api.total) * 100) : 0}%`);
  
  console.log('\nWEBSOCKET CONNECTIVITY:');
  console.log(`Connection Success: ${results.websocket.connected ? '✓ Yes' : '✗ No'}`);
  console.log(`Messages Sent: ${results.websocket.pingsSent}`);
  console.log(`Responses Received: ${results.websocket.responsesReceived}`);
  console.log(`Errors: ${results.websocket.errors}`);
  
  console.log('\nOVERALL ASSESSMENT:');
  const apiSuccess = results.api.total > 0 && (results.api.successful / results.api.total) > 0.8;
  const wsSuccess = results.websocket.connected && results.websocket.responsesReceived > 0;
  
  if (apiSuccess && wsSuccess) {
    console.log('✅ BOTH HTTP API AND WEBSOCKET ARE WORKING PROPERLY');
    console.log('Gateway integration should function correctly');
  } else if (apiSuccess) {
    console.log('⚠️ HTTP API IS WORKING, BUT WEBSOCKET HAS ISSUES');
    console.log('Gateway integration will work with limitations');
  } else if (wsSuccess) {
    console.log('⚠️ WEBSOCKET IS WORKING, BUT HTTP API HAS ISSUES');
    console.log('Gateway integration will work with limitations');
  } else {
    console.log('❌ BOTH HTTP API AND WEBSOCKET ARE FAILING');
    console.log('Gateway integration will not function properly');
  }
  
  console.log('======================================================\n');
}

/**
 * Clean up and exit
 */
function cleanupAndExit() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('Closing WebSocket connection...');
    ws.close();
  }
  
  clearInterval(testInterval);
  displaySummary();
}

/**
 * Main function
 */
async function main() {
  console.log('\n=================================================');
  console.log('   GATEWAY INTEGRATION TEST');
  console.log(`   EMS Server: ${config.emsServerUrl}`);
  console.log(`   WebSocket: ${config.wsUrl}`);
  console.log(`   Gateway ID: ${config.gatewayId}`);
  console.log('=================================================\n');
  
  // Test HTTP API endpoints
  await testApiEndpoint({ 
    url: '/api/health', 
    method: 'GET', 
    name: 'API Health Check'
  });
  
  await testApiEndpoint({ 
    url: '/api/gateways', 
    method: 'GET', 
    name: 'List Gateways'
  });
  
  // Create a test gateway
  const gateway = await testApiEndpoint({ 
    url: '/api/gateways', 
    method: 'POST', 
    name: 'Create Gateway',
    body: {
      name: 'Integration Test Gateway',
      type: 'energy_gateway',
      model: 'Test Model',
      manufacturer: 'Test Manufacturer',
      serialNumber: config.gatewayId,
      firmwareVersion: '1.0.0',
      connectionStatus: 'online'
    }
  });
  
  // Connect to WebSocket
  connectWebSocket();
  
  // Run for test duration then exit
  setTimeout(() => {
    console.log(`\nTest duration (${config.testDurationMs / 1000} seconds) completed`);
    cleanupAndExit();
  }, config.testDurationMs);
}

// Start the test
main().catch(console.error);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nTest interrupted by user');
  cleanupAndExit();
  process.exit(0);
});