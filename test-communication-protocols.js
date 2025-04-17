/**
 * Test script for the enhanced communication protocols
 */

// Run with: node test-communication-protocols.js

async function testCommunicationProtocols() {
  try {
    // Initialize MQTT and other dependencies
    require('dotenv').config();
    
    // Import the demonstration function
    const { demonstrateCommunicationProtocols } = require('./server/examples/communication-protocols-example');
    
    // Run the demonstration
    await demonstrateCommunicationProtocols();
    
    console.log('Communication protocols test completed successfully!');
    
    // Exit after the test completes
    setTimeout(() => process.exit(0), 1000);
  } catch (error) {
    console.error('Error running communication protocols test:', error);
    process.exit(1);
  }
}

// Execute the test
testCommunicationProtocols();