const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API...');
    
    const response = await fetch('http://localhost:5000/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: "A beautiful sunset over the ocean"
      })
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();