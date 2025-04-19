/**
 * Test script to verify the Israeli tariff integration with the optimization engine
 * 
 * This script:
 * 1. Creates a demo environment with Israeli tariff data
 * 2. Fetches the tariff information
 * 3. Tests the optimization engine's awareness of the tariff
 * 4. Verifies the tariff's influence on optimization decisions
 */

import axios from 'axios';

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
    console.log(`Running standard optimization for site ${siteId}...`);
    const response = await axios.post(`${API_BASE}/sites/${siteId}/optimize`, {
      mode: 'cost_saving',
      lookAheadHours: 24
    });
    
    console.log('Standard optimization result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to run standard optimization:', error.response?.data || error.message);
    return null;
  }
}

async function runTariffOptimization() {
  try {
    console.log(`Running tariff-aware optimization for site ${siteId}...`);
    const response = await axios.post(`${API_BASE}/sites/${siteId}/optimize/tariff`, {
      lookAheadHours: 24
    });
    
    console.log('Tariff-aware optimization result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to run tariff-aware optimization:', error.response?.data || error.message);
    return null;
  }
}

async function runTariffStrategy(strategy) {
  try {
    console.log(`Running tariff strategy "${strategy}" for site ${siteId}...`);
    const response = await axios.post(`${API_BASE}/sites/${siteId}/optimize/strategy/${strategy}`);
    
    console.log(`Strategy "${strategy}" result:`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`Failed to run tariff strategy "${strategy}":`, error.response?.data || error.message);
    return null;
  }
}

async function getOptimizationSummary() {
  try {
    console.log(`Getting tariff optimization summary for site ${siteId}...`);
    const response = await axios.get(`${API_BASE}/sites/${siteId}/optimize/tariff-summary`);
    
    console.log('Tariff optimization summary:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to get optimization summary:', error.response?.data || error.message);
    return null;
  }
}

async function testTariffSpecificRecommendations() {
  try {
    console.log(`Testing tariff-specific recommendations for site ${siteId}...`);
    
    // Get the current tariff info first
    const tariffInfo = await fetchTariff();
    if (!tariffInfo) {
      console.error('Failed to get tariff information');
      return null;
    }
    
    // Test battery charge recommendations
    const batteryResponse = await axios.get(`${API_BASE}/sites/${siteId}/battery/recommendations`);
    console.log('Battery charge/discharge recommendations:');
    console.log(JSON.stringify(batteryResponse.data, null, 2));
    
    // Test EV charging recommendations
    const evResponse = await axios.get(`${API_BASE}/sites/${siteId}/ev/recommendations`);
    console.log('EV charging recommendations:');
    console.log(JSON.stringify(evResponse.data, null, 2));
    
    // Test heat pump recommendations
    const heatPumpResponse = await axios.get(`${API_BASE}/sites/${siteId}/heat-pump/recommendations`);
    console.log('Heat pump operation recommendations:');
    console.log(JSON.stringify(heatPumpResponse.data, null, 2));
    
    // Return all recommendations for analysis
    return {
      batteryRecommendations: batteryResponse.data,
      evRecommendations: evResponse.data,
      heatPumpRecommendations: heatPumpResponse.data,
      tariffInfo
    };
  } catch (error) {
    console.error('Failed to test tariff-specific recommendations:', error.response?.data || error.message);
    return null;
  }
}

async function verifyTariffAwareness(optimization, tariff) {
  // Check if optimization contains reasoning or rationale fields
  if (!optimization || (!optimization.reasoning && !optimization.rationale && !optimization.explanation && !optimization.description)) {
    console.log('\nVerifying tariff awareness in optimization:');
    console.log('❌ Cannot verify tariff awareness - optimization result lacks reasoning/explanation field');
    return false;
  }
  
  // Get the reasoning text from whichever field is available
  const reasoningText = optimization.reasoning || optimization.rationale || optimization.explanation || optimization.description || '';
  const reasoning = reasoningText.toLowerCase();
  
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
  
  // Also check the entire optimization object for these terms
  const fullOptimizationStr = JSON.stringify(optimization).toLowerCase();
  mentions.forEach(term => {
    if (!tariffAware && fullOptimizationStr.includes(term)) {
      tariffAware = true;
      foundMentions.push(`${term} (in response)`);
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
  
  // Step 4: Run standard optimization
  const optimization = await runOptimization();
  if (!optimization) {
    console.log('Exiting due to optimization failure');
    return;
  }
  
  // Step 5: Verify standard optimization tariff awareness
  const isStandardTariffAware = await verifyTariffAwareness(optimization, tariff);
  
  // Step 6: Get tariff optimization summary
  const optimizationSummary = await getOptimizationSummary();
  
  // Step 7: Run tariff-specific optimization
  const tariffOptimization = await runTariffOptimization();
  
  // Step 8: Verify tariff-specific optimization awareness
  let isTariffOptimizationAware = false;
  if (tariffOptimization) {
    isTariffOptimizationAware = await verifyTariffAwareness(tariffOptimization, tariff);
  }
  
  // Step 9: Test specific tariff strategies
  console.log('\nTesting specific tariff strategies:');
  
  // Battery arbitrage strategy
  const batteryArbitrageResult = await runTariffStrategy('battery-arbitrage');
  
  // EV smart charging strategy  
  const evSmartChargingResult = await runTariffStrategy('ev-smart-charging');
  
  // Heat pump optimization strategy
  const heatPumpResult = await runTariffStrategy('heat-pump-optimization');
  
  // Israeli ToU specific strategy
  const israeliTouResult = await runTariffStrategy('israeli-tou');
  
  // Step 10: Test device-specific recommendations based on tariff
  const recommendationsResults = await testTariffSpecificRecommendations();
  
  console.log('\nTest summary:');
  console.log(`- Israeli tariff created: ${tariff.name.includes('Israeli') ? '✅' : '❌'}`);
  console.log(`- Time-of-Use enabled: ${tariff.isTimeOfUse ? '✅' : '❌'}`);
  console.log(`- Current rate period: ${currentRate ? '✅ ' + currentRate.period : '❌'}`);
  console.log(`- Standard optimization tariff-aware: ${isStandardTariffAware ? '✅' : '❌'}`);
  console.log(`- Tariff summary available: ${optimizationSummary ? '✅' : '❌'}`);
  console.log(`- Tariff-specific optimization successful: ${tariffOptimization ? '✅' : '❌'}`);
  console.log(`- Tariff-specific optimization tariff-aware: ${isTariffOptimizationAware ? '✅' : '❌'}`);
  
  // Strategies test summary
  console.log('\nTariff strategies test summary:');
  console.log(`- Battery arbitrage strategy: ${batteryArbitrageResult ? '✅' : '❌'}`);
  console.log(`- EV smart charging strategy: ${evSmartChargingResult ? '✅' : '❌'}`);
  console.log(`- Heat pump optimization strategy: ${heatPumpResult ? '✅' : '❌'}`);
  console.log(`- Israeli ToU specific strategy: ${israeliTouResult ? '✅' : '❌'}`);
  
  // Device-specific recommendations test summary
  console.log('\nDevice-specific recommendations test summary:');
  console.log(`- Battery recommendations: ${recommendationsResults?.batteryRecommendations ? '✅' : '❌'}`);
  console.log(`- EV charging recommendations: ${recommendationsResults?.evRecommendations ? '✅' : '❌'}`);
  console.log(`- Heat pump recommendations: ${recommendationsResults?.heatPumpRecommendations ? '✅' : '❌'}`);
  
  // Check if recommendations mention tariff or ToU pricing
  if (recommendationsResults) {
    const batteryMentionsTariff = JSON.stringify(recommendationsResults.batteryRecommendations).toLowerCase().includes('tariff');
    const evMentionsTariff = JSON.stringify(recommendationsResults.evRecommendations).toLowerCase().includes('tariff');
    const heatPumpMentionsTariff = JSON.stringify(recommendationsResults.heatPumpRecommendations).toLowerCase().includes('tariff');
    
    console.log(`- Battery recommendations tariff-aware: ${batteryMentionsTariff ? '✅' : '❌'}`);
    console.log(`- EV recommendations tariff-aware: ${evMentionsTariff ? '✅' : '❌'}`);
    console.log(`- Heat pump recommendations tariff-aware: ${heatPumpMentionsTariff ? '✅' : '❌'}`);
  }
  
  // Compare standard vs tariff-specific optimization
  if (optimization && tariffOptimization) {
    console.log('\nComparison of optimizations:');
    
    // Get text content to search for tariff awareness
    const standardText = JSON.stringify(optimization).toLowerCase();
    const tariffSpecificText = JSON.stringify(tariffOptimization).toLowerCase();
    
    const standardMentionsTariff = standardText.includes('tariff');
    const tariffSpecificMentionsTariff = tariffSpecificText.includes('tariff');
    
    console.log(`- Standard optimization mentions "tariff": ${standardMentionsTariff ? '✅' : '❌'}`);
    console.log(`- Tariff-specific optimization mentions "tariff": ${tariffSpecificMentionsTariff ? '✅' : '❌'}`);
    
    // Check if the tariff-specific optimization has different recommendations
    let hasDifferentRecommendations = false;
    
    if (optimization.recommendations && tariffOptimization.recommendations) {
      hasDifferentRecommendations = JSON.stringify(optimization.recommendations) !== 
        JSON.stringify(tariffOptimization.recommendations);
      console.log(`- Tariff-specific optimization has different recommendations: ${hasDifferentRecommendations ? '✅' : '❌'}`);
    } else {
      console.log('- Cannot compare recommendations (missing in one or both optimizations)');
    }
    
    // Check if there are any differences in the full response
    const isDifferent = standardText !== tariffSpecificText;
    console.log(`- Responses are different: ${isDifferent ? '✅' : '❌'}`);
  }
}

main().catch(error => {
  console.error('Test failed with error:', error);
});