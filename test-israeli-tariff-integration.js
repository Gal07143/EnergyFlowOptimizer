/**
 * Test script to verify the Israeli tariff integration with the optimization engine
 * 
 * This script:
 * 1. Creates a demo environment with Israeli tariff data
 * 2. Fetches the tariff information
 * 3. Tests the optimization engine's awareness of the tariff
 * 4. Verifies the tariff's influence on optimization decisions
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = null;
let siteId = null;

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_BASE}/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    authToken = response.data.token;
    console.log('Login successful!');
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createDemoData() {
  try {
    console.log('Creating demo data...');
    const response = await axios.post(`${API_BASE}/demo-setup`);
    
    siteId = response.data.site.id;
    console.log(`Demo data created successfully! Site ID: ${siteId}`);
    return true;
  } catch (error) {
    console.error('Failed to create demo data:', error.response?.data || error.message);
    return false;
  }
}

async function fetchTariff() {
  try {
    console.log(`Fetching tariff for site ${siteId}...`);
    const response = await axios.get(`${API_BASE}/sites/${siteId}/tariff`);
    
    console.log('Tariff details:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tariff:', error.response?.data || error.message);
    return null;
  }
}

async function getCurrentTariffRate() {
  try {
    console.log(`Fetching current tariff rate for site ${siteId}...`);
    const response = await axios.get(`${API_BASE}/sites/${siteId}/tariff/rate`);
    
    console.log('Current tariff rate:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current tariff rate:', error.response?.data || error.message);
    return null;
  }
}

async function runOptimization() {
  try {
    console.log(`Running optimization for site ${siteId}...`);
    const response = await axios.post(`${API_BASE}/sites/${siteId}/optimize`, {
      mode: 'cost_saving',
      lookAheadHours: 24
    });
    
    console.log('Optimization result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to run optimization:', error.response?.data || error.message);
    return null;
  }
}

async function verifyTariffAwareness(optimization, tariff) {
  // Check if the optimization reasoning mentions tariff or pricing
  const reasoning = optimization.reasoning.toLowerCase();
  const mentions = [
    'tariff',
    'price',
    'cost',
    'peak',
    'off-peak',
    'shoulder',
    'time-of-use',
    'tou',
    'israeli'
  ];
  
  let tariffAware = false;
  const foundMentions = [];
  
  mentions.forEach(term => {
    if (reasoning.includes(term)) {
      tariffAware = true;
      foundMentions.push(term);
    }
  });
  
  console.log('\nVerifying tariff awareness in optimization:');
  if (tariffAware) {
    console.log('✅ Optimization is tariff-aware!');
    console.log(`Mentions: ${foundMentions.join(', ')}`);
  } else {
    console.log('❌ Optimization does not appear to consider tariff information.');
  }
  
  return tariffAware;
}

async function main() {
  // Step 1: Create demo data (which includes Israeli tariff)
  if (!(await createDemoData())) {
    console.log('Exiting due to demo data creation failure');
    return;
  }
  
  // Step 2: Fetch tariff information
  const tariff = await fetchTariff();
  if (!tariff) {
    console.log('Exiting due to tariff fetch failure');
    return;
  }
  
  // Step 3: Get current tariff rate
  const currentRate = await getCurrentTariffRate();
  
  // Step 4: Run optimization
  const optimization = await runOptimization();
  if (!optimization) {
    console.log('Exiting due to optimization failure');
    return;
  }
  
  // Step 5: Verify tariff awareness
  const isTariffAware = await verifyTariffAwareness(optimization, tariff);
  
  console.log('\nTest summary:');
  console.log(`- Israeli tariff created: ${tariff.name.includes('Israeli') ? '✅' : '❌'}`);
  console.log(`- Time-of-Use enabled: ${tariff.isTimeOfUse ? '✅' : '❌'}`);
  console.log(`- Current rate period: ${currentRate ? '✅ ' + currentRate.period : '❌'}`);
  console.log(`- Optimization tariff-aware: ${isTariffAware ? '✅' : '❌'}`);
}

main().catch(error => {
  console.error('Test failed with error:', error);
});