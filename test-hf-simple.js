const fetch = require('node-fetch');

async function testSimple() {
  const token = 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;
  
  console.log('Testing Hugging Face API with CogVideoX-2b...');
  
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/zai-org/CogVideoX-2b',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: "A professional video about a fintech app called DukaApp helping Kenyan shop owners get loans",
        })
      }
    );
    
    if (response.status === 503) {
      console.log('⏳ Model is loading. This can take 2-3 minutes. Please wait...');
      console.log('💡 The model will be loaded and ready for future requests.');
      
      // Get estimated time
      const headers = response.headers.get('x-wait-time');
      if (headers) {
        console.log(`⏱️ Estimated wait time: ${headers}`);
      }
      return;
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Success! Saving video...');
    const buffer = await response.buffer();
    
    const fs = require('fs');
    fs.writeFileSync('test-video.mp4', buffer);
    console.log('💾 Video saved as test-video.mp4');
    console.log(`📊 Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimple();