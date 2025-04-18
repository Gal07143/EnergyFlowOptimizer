/**
 * WebSocket Connectivity Test for Energy Management System
 * 
 * This script tests WebSocket connectivity to the EMS server.
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const config = {
  wsUrl: 'ws://localhost:5000/ws',
  connectionTimeoutMs: 10000,
  pingIntervalMs: 2000,
  testDurationMs: 30000
};

// Connection state
let ws = null;
let connected = false;
let pingCount = 0;
let pongCount = 0;
let errorCount = 0;
let lastPingSent = null;
let testInterval = null;
let connectionTimeout = null;

// Function to connect to WebSocket server
function connectWebSocket() {
  console.log(`\n===== CONNECTING TO WEBSOCKET SERVER =====`);
  console.log(`URL: ${config.wsUrl}`);
  
  try {
    ws = new WebSocket(config.wsUrl);
    
    // Set up connection timeout
    connectionTimeout = setTimeout(() => {
      if (!connected) {
        console.error(`Connection timeout after ${config.connectionTimeoutMs}ms`);
        cleanupAndExit(1);
      }
    }, config.connectionTimeoutMs);
    
    // Set up event handlers
    ws.on('open', () => {
      console.log(`✓ Successfully connected to WebSocket server`);
      connected = true;
      clearTimeout(connectionTimeout);
      
      // Send initial ping
      sendPing();
      
      // Set up ping interval
      testInterval = setInterval(() => {
        sendPing();
      }, config.pingIntervalMs);
      
      // Set up test duration timeout
      setTimeout(() => {
        console.log(`\nTest duration (${config.testDurationMs / 1000} seconds) completed`);
        displayResults();
        cleanupAndExit(0);
      }, config.testDurationMs);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`← Received message: ${JSON.stringify(message)}`);
        
        if (message.type === 'pong' || 
            (message.type === 'connected' && lastPingSent)) {
          pongCount++;
          const roundTripTime = message.timestamp 
            ? (Date.now() - lastPingSent)
            : 'unknown';
          console.log(`✓ Received pong/response (Round trip: ${roundTripTime}ms)`);
        }
      } catch (error) {
        console.error(`Failed to parse message: ${error.message}`);
        console.log(`Raw message: ${data.toString()}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`✗ WebSocket error: ${error.message}`);
      errorCount++;
    });
    
    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed (code: ${code}, reason: ${reason || 'No reason provided'})`);
      connected = false;
      clearInterval(testInterval);
    });
    
  } catch (error) {
    console.error(`Failed to setup WebSocket connection: ${error.message}`);
    cleanupAndExit(1);
  }
}

// Function to send a ping message
function sendPing() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error(`Cannot send ping: WebSocket not connected`);
    return;
  }
  
  try {
    lastPingSent = Date.now();
    const pingMessage = {
      type: 'ping',
      id: uuidv4(),
      timestamp: lastPingSent
    };
    
    ws.send(JSON.stringify(pingMessage));
    console.log(`→ Sent ping (${new Date().toISOString()})`);
    pingCount++;
  } catch (error) {
    console.error(`Error sending ping: ${error.message}`);
    errorCount++;
  }
}

// Function to display test results
function displayResults() {
  console.log('\n\n=========== WEBSOCKET TEST RESULTS ===========');
  console.log(`Connection Success: ${connected ? '✓ Yes' : '✗ No'}`);
  console.log(`Connection URL: ${config.wsUrl}`);
  console.log(`Pings Sent: ${pingCount}`);
  console.log(`Pongs Received: ${pongCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Response Rate: ${pingCount > 0 ? Math.round((pongCount / pingCount) * 100) : 0}%`);
  
  console.log('\nOverall Assessment:');
  if (connected && pongCount > 0) {
    console.log('✅ WebSocket connectivity is WORKING PROPERLY');
  } else if (connected) {
    console.log('⚠️ WebSocket connection established but NO RESPONSES received');
  } else {
    console.log('❌ WebSocket connectivity is FAILING - could not establish connection');
  }
  
  console.log('============================================\n');
}

// Function to clean up and exit
function cleanupAndExit(code) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  clearTimeout(connectionTimeout);
  clearInterval(testInterval);
  
  if (code !== 0) {
    displayResults();
    process.exit(code);
  }
}

// Capture Ctrl+C to display results before exiting
process.on('SIGINT', () => {
  console.log('\nTest interrupted by user');
  displayResults();
  process.exit(0);
});

// Main function
function main() {
  console.log('\n========================================');
  console.log('   WEBSOCKET CONNECTIVITY TEST');
  console.log(`   Testing server: ${config.wsUrl}`);
  console.log(`   Test duration: ${config.testDurationMs / 1000} seconds`);
  console.log('========================================\n');
  
  connectWebSocket();
}

// Start the test
main();