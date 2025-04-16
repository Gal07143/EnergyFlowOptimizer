// Test script for initialization endpoint
const fetch = require('node-fetch');

async function testInit() {
  try {
    console.log("Testing initialization endpoint...");
    
    // Call the initialization endpoint
    const initResponse = await fetch('http://localhost:5000/api/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const initData = await initResponse.json();
    console.log("Initialization response:", JSON.stringify(initData, null, 2));
    
    // Now try to login with the demo user
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });
    
    if (loginResponse.ok) {
      const userData = await loginResponse.json();
      console.log("Login successful! User data:", JSON.stringify(userData, null, 2));
      
      // Now try to get the user data
      const userResponse = await fetch('http://localhost:5000/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': loginResponse.headers.get('set-cookie')
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log("User data fetch successful:", JSON.stringify(userData, null, 2));
      } else {
        console.log("Failed to get user data:", userResponse.status, await userResponse.text());
      }
    } else {
      console.log("Login failed:", loginResponse.status, await loginResponse.text());
    }
    
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

testInit();