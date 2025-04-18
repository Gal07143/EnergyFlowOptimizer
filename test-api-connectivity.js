/**
 * API Connectivity Test for Energy Management System
 * 
 * This script tests the HTTP API connectivity to the EMS server,
 * focusing on key endpoints for the gateway and device communication.
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const config = {
  emsServerUrl: 'http://localhost:5000',
  testEndpoints: [
    { url: '/api/health', method: 'GET', name: 'Health Check' },
    { url: '/api/healthcheck', method: 'GET', name: 'Health Check (Alternative)' },
    { url: '/api/devices', method: 'GET', name: 'List Devices' },
    { url: '/api/sites', method: 'GET', name: 'List Sites' },
    { url: '/api/gateways', method: 'GET', name: 'List Gateways' }
  ]
};

// Results tracking
const results = {
  total: 0,
  successful: 0,
  failed: 0,
  endpoints: {}
};

/**
 * Test connectivity to a specific API endpoint
 */
async function testEndpoint(endpoint) {
  const { url, method, name } = endpoint;
  const fullUrl = `${config.emsServerUrl}${url}`;
  
  console.log(`\n----- Testing ${name} (${method} ${url}) -----`);
  results.total++;
  
  try {
    const startTime = Date.now();
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
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
    if (isSuccess) results.successful++;
    else results.failed++;
    
    results.endpoints[url] = {
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
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    results.failed++;
    results.endpoints[url] = {
      success: false,
      error: error.message
    };
  }
}

/**
 * Display test summary
 */
function displaySummary() {
  console.log('\n\n=========== API CONNECTIVITY TEST RESULTS ===========');
  console.log(`Total Endpoints Tested: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.successful / results.total) * 100)}%`);
  
  console.log('\nEndpoint Details:');
  for (const [url, result] of Object.entries(results.endpoints)) {
    const statusText = result.success 
      ? `✓ ${result.status || 'OK'} (${result.responseTime}ms)` 
      : `✗ ${result.status || result.error || 'Failed'}`;
    console.log(`  ${url}: ${statusText}`);
  }
  
  console.log('\nOverall Assessment:');
  if (results.successful === results.total) {
    console.log('✅ API connectivity is WORKING PROPERLY');
  } else if (results.successful > 0) {
    console.log('⚠️ API connectivity is PARTIALLY WORKING - some endpoints are accessible');
  } else {
    console.log('❌ API connectivity is FAILING - none of the tested endpoints are accessible');
  }
  
  console.log('====================================\n');
}

/**
 * Main function
 */
async function main() {
  console.log('\n========================================');
  console.log('   EMS API CONNECTIVITY TEST');
  console.log(`   Testing server: ${config.emsServerUrl}`);
  console.log('========================================\n');
  
  // Test each endpoint
  for (const endpoint of config.testEndpoints) {
    await testEndpoint(endpoint);
  }
  
  // Display summary
  displaySummary();
}

// Run the test
main().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});