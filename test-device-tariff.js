/**
 * Device-Specific Tariff Test
 * 
 * This script tests the device-specific tariff functionality:
 * 1. Create demo environment with sites, devices, and tariffs
 * 2. Assign a specific tariff to a device
 * 3. Verify the device uses its specific tariff instead of site tariff
 * 4. Remove the device-specific tariff and verify fallback to site tariff
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
let auth = {
  username: 'admin',
  password: 'admin123'
};

// Global state
let authToken = null;
let siteId = null;
let deviceId = null;
let siteTariffId = null;
let deviceTariffId = null;

// Utility function for authenticated requests
async function authenticatedRequest(method, endpoint, data = null) {
  try {
    const config = {
      headers: {}
    };
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    const url = `${BASE_URL}${endpoint}`;
    
    if (method === 'GET') {
      return await axios.get(url, config);
    } else if (method === 'POST') {
      return await axios.post(url, data, config);
    } else if (method === 'PUT') {
      return await axios.put(url, data, config);
    } else if (method === 'DELETE') {
      return await axios.delete(url, config);
    }
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error.response?.data || error.message);
    throw error;
  }
}

// Step 1: Login to get authentication token
async function login() {
  console.log('\n🔑 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/login`, auth);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Step 2: Create demo environment
async function createDemoData() {
  console.log('\n🌱 Creating demo data...');
  
  // Create a demo site
  console.log('Creating demo site...');
  const siteResponse = await authenticatedRequest('POST', '/sites', {
    name: 'Demo Site for Device Tariff Test',
    location: 'Tel Aviv, Israel',
    capacity: 50,
    timezone: 'Asia/Jerusalem'
  });
  
  siteId = siteResponse.data.id;
  console.log(`✅ Demo site created with ID: ${siteId}`);
  
  // Create demo devices
  console.log('Creating demo devices...');
  
  // Create a solar panel
  const solarResponse = await authenticatedRequest('POST', '/devices', {
    name: 'Solar Panel for Tariff Test',
    type: 'solar_pv',
    model: 'SolarEdge SE10K',
    manufacturer: 'SolarEdge',
    capacity: 10,
    siteId: siteId
  });
  
  deviceId = solarResponse.data.id;
  console.log(`✅ Demo solar panel created with ID: ${deviceId}`);
  
  // Create site tariff (standard)
  console.log('Creating site tariff...');
  const siteTariffResponse = await authenticatedRequest('POST', `/sites/${siteId}/tariff`, {
    name: 'Site Standard Tariff',
    provider: 'Demo Utility',
    importRate: 0.45,
    exportRate: 0.15,
    currency: 'USD',
    isTimeOfUse: false
  });
  
  siteTariffId = siteTariffResponse.data.id;
  console.log(`✅ Site tariff created with ID: ${siteTariffId}`);
  
  // Create device-specific tariff (higher rate)
  console.log('Creating device-specific tariff...');
  const deviceTariffResponse = await authenticatedRequest('POST', `/sites/${siteId}/tariff`, {
    name: 'Solar Panel Special Tariff',
    provider: 'Demo Utility - Solar Division',
    importRate: 0.35,  // Lower import rate for solar panel
    exportRate: 0.25,  // Higher export rate for solar panel
    currency: 'USD',
    isTimeOfUse: false
  });
  
  deviceTariffId = deviceTariffResponse.data.id;
  console.log(`✅ Device-specific tariff created with ID: ${deviceTariffId}`);
  
  return {
    siteId,
    deviceId,
    siteTariffId,
    deviceTariffId
  };
}

// Step 3: Get site tariff
async function getSiteTariff() {
  console.log('\n🔍 Getting site tariff...');
  const response = await authenticatedRequest('GET', `/sites/${siteId}/tariff`);
  console.log('✅ Site tariff:', response.data);
  return response.data;
}

// Step 4: Get device tariff before assignment
async function getDeviceTariffBefore() {
  console.log('\n🔍 Getting device tariff before assignment...');
  const response = await authenticatedRequest('GET', `/devices/${deviceId}/tariff`);
  console.log('✅ Device tariff (should be site tariff):', response.data);
  
  // Verify it's using the site tariff
  if (response.data.id === siteTariffId && response.data.source === 'site') {
    console.log('✅ Device is correctly using site tariff');
  } else {
    console.error('❌ Device is not using site tariff as expected');
  }
  
  return response.data;
}

// Step 5: Assign specific tariff to device
async function assignDeviceTariff() {
  console.log('\n🔄 Assigning specific tariff to device...');
  const response = await authenticatedRequest('POST', `/devices/${deviceId}/tariff/${deviceTariffId}`);
  console.log('✅ Device tariff assignment response:', response.data);
  return response.data;
}

// Step 6: Get device tariff after assignment
async function getDeviceTariffAfter() {
  console.log('\n🔍 Getting device tariff after assignment...');
  const response = await authenticatedRequest('GET', `/devices/${deviceId}/tariff`);
  console.log('✅ Device tariff (should be device-specific):', response.data);
  
  // Verify it's using the device-specific tariff
  if (response.data.id === deviceTariffId && response.data.source === 'device' && response.data.isDeviceSpecific) {
    console.log('✅ Device is correctly using device-specific tariff');
  } else {
    console.error('❌ Device is not using device-specific tariff as expected');
  }
  
  return response.data;
}

// Step 7: Remove device-specific tariff
async function removeDeviceTariff() {
  console.log('\n🗑️ Removing device-specific tariff...');
  const response = await authenticatedRequest('DELETE', `/devices/${deviceId}/tariff`);
  console.log('✅ Tariff removal response:', response.data);
  return response.data;
}

// Step 8: Get device tariff after removal
async function getDeviceTariffAfterRemoval() {
  console.log('\n🔍 Getting device tariff after removal...');
  const response = await authenticatedRequest('GET', `/devices/${deviceId}/tariff`);
  console.log('✅ Device tariff (should be back to site tariff):', response.data);
  
  // Verify it's back to using the site tariff
  if (response.data.id === siteTariffId && response.data.source === 'site' && !response.data.isDeviceSpecific) {
    console.log('✅ Device is correctly back to using site tariff');
  } else {
    console.error('❌ Device is not using site tariff as expected after removal');
  }
  
  return response.data;
}

// Main test function
async function runTest() {
  try {
    console.log('🧪 Starting Device-Specific Tariff Test');
    
    // Step 1: Login to get authentication token
    await login();
    
    // Step 2: Create demo environment
    await createDemoData();
    
    // Step 3: Get site tariff
    const siteTariff = await getSiteTariff();
    
    // Step 4: Get device tariff before assignment
    const deviceTariffBefore = await getDeviceTariffBefore();
    
    // Step 5: Assign specific tariff to device
    await assignDeviceTariff();
    
    // Step 6: Get device tariff after assignment
    const deviceTariffAfter = await getDeviceTariffAfter();
    
    // Step 7: Remove device-specific tariff
    await removeDeviceTariff();
    
    // Step 8: Get device tariff after removal
    const deviceTariffAfterRemoval = await getDeviceTariffAfterRemoval();
    
    console.log('\n✅ Device-Specific Tariff Test completed successfully');
    
    // Save test results to file
    const testResults = {
      siteTariff,
      deviceTariffBefore,
      deviceTariffAfter,
      deviceTariffAfterRemoval
    };
    
    fs.writeFileSync('device-tariff-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('✅ Test results saved to device-tariff-test-results.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();