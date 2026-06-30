const fetch = require('node-fetch');

async function testHuggingFace() {
  try {
    // Read token from .env
    require('dotenv').config();
    const token = process.env.HF_TOKEN;
    
    if (!token) {
      console.error('❌ HF_TOKEN not found in .env file');
      console.log('Please add: HF_TOKEN=hf_your_token_here');
      return;
    }
    
    console.log('🔑 Token found, testing...');
    
    // Test with a simple model first
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: "A beautiful sunset over the ocean",
          parameters: {
            candidate_labels: ["nature", "city", "ocean"]
          }
        })
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token is valid!');
      console.log('Response:', data);
    } else {
      const error = await response.text();
      console.error('❌ Token invalid or API error:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testHuggingFace();