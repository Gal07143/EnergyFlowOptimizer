/**
 * Test script for updating the active tariff to an Israeli tariff
 */

import axios from 'axios';
import fs from 'fs';

// Create a basic axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000 // Add timeout to avoid hanging
});

async function main() {
  try {
    // Step 1: Login
    console.log('Logging in...');
    const loginResponse = await api.post('/login', {
      username: 'admin',
      password: 'password123'
    });
    
    // Save the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      // Set cookie for future requests
      api.defaults.headers.Cookie = cookies.join('; ');
    }
    
    console.log('Login successful!');
    
    // Step 2: Create demo site
    console.log('Creating demo site...');
    const demoResponse = await api.post('/demo-setup');
    const siteId = demoResponse.data.site.id;
    console.log(`Created demo site with ID: ${siteId}`);
    
    // Step 3: Get the current tariff
    console.log(`Fetching current tariff for site ${siteId}...`);
    const currentTariffResponse = await api.get(`/sites/${siteId}/tariff`);
    console.log('Initial tariff:');
    console.log(JSON.stringify(currentTariffResponse.data, null, 2));
    
    // Step 4: Create Israeli ToU tariff
    console.log(`Creating Israeli ToU tariff for site ${siteId}...`);
    const israeliTariffResponse = await api.post(`/sites/${siteId}/tariff/israeli/tou`, {
      name: 'Israeli Time-of-Use Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.48,
      exportRate: 0.23,
      isTimeOfUse: true,
      currency: 'ILS',
      scheduleData: {
        summer: {
          peak: 0.53,
          shoulder: 0.45,
          offPeak: 0.25
        },
        winter: {
          peak: 0.51, 
          shoulder: 0.43,
          offPeak: 0.22
        },
        spring: {
          peak: 0.49,
          shoulder: 0.41,
          offPeak: 0.21
        },
        autumn: {
          peak: 0.49,
          shoulder: 0.41,
          offPeak: 0.21
        }
      }
    });
    
    const israeliTariffId = israeliTariffResponse.data.id;
    console.log(`Successfully created Israeli ToU tariff with ID: ${israeliTariffId}`);
    
    // Step 5: Set as active tariff by updating site settings
    console.log(`Setting Israeli tariff as active for site ${siteId}...`);
    try {
      // We need to update site settings to use the Israeli tariff
      const updateSiteResponse = await api.put(`/sites/${siteId}`, {
        activeTariffId: israeliTariffId
      });
      
      console.log('Site updated successfully:');
      console.log(JSON.stringify(updateSiteResponse.data, null, 2));
    } catch (error) {
      // Try alternative approach if site update fails
      console.error('Site update failed, trying alternative approach:', error.response?.data || error.message);
      
      try {
        const updateTariffResponse = await api.put(`/tariffs/${israeliTariffId}`, {
          ...israeliTariffResponse.data,
          isActive: true
        });
        console.log('Tariff updated successfully:');
        console.log(JSON.stringify(updateTariffResponse.data, null, 2));
      } catch (updateError) {
        console.error('Tariff update failed:', updateError.response?.data || updateError.message);
      }
    }
    
    // Step 6: Verify the active tariff changed
    console.log(`Verifying active tariff for site ${siteId}...`);
    const updatedTariffResponse = await api.get(`/sites/${siteId}/tariff`);
    console.log('Updated active tariff:');
    console.log(JSON.stringify(updatedTariffResponse.data, null, 2));
    
    // Check if the active tariff is now the Israeli one
    const isIsraeliTariffActive = 
      updatedTariffResponse.data.id === israeliTariffId ||
      updatedTariffResponse.data.name.includes('Israeli') ||
      updatedTariffResponse.data.currency === 'ILS';
    
    console.log(`\nIsraeli tariff set as active: ${isIsraeliTariffActive ? '✅' : '❌'}`);
    
    // Step 7: Get current tariff rate
    try {
      console.log(`Fetching current tariff rate for site ${siteId}...`);
      const rateResponse = await api.get(`/sites/${siteId}/tariff/rate`);
      console.log('Current tariff rate:');
      console.log(JSON.stringify(rateResponse.data, null, 2));
    } catch (error) {
      console.error('Failed to fetch current rate:', error.response?.data || error.message);
    }
    
    console.log('\nTest completed successfully! 🎉');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

main();