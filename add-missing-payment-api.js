const fetch = require('node-fetch');

async function addMissingPayment() {
  try {
    console.log('📝 Adding missing payment via API...');
    
    const response = await fetch('https://video-creator-api-kjzy.onrender.com/api/admin/add-missing-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: "katungu1@gmail.com",
        amount: 300,
        serviceType: "textToVideo",
        paymentMethod: "mpesa",
        reference: "MPESA-2026-07-21-001"
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Payment added successfully!');
      console.log('📊 Response:', data);
    } else {
      console.log('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Failed to add payment:', error.message);
    
    // If the endpoint doesn't exist yet, try the direct data approach
    console.log('\n🔄 Trying alternative approach...');
    await addPaymentDirect();
  }
}

async function addPaymentDirect() {
  try {
    // First, check if we can get the current data
    const dataResponse = await fetch('https://video-creator-api-kjzy.onrender.com/api/health');
    const health = await dataResponse.json();
    console.log('📊 Health check:', health);
    
    // If we can't use the API, we need to deploy the updated server.js first
    console.log('\n⚠️ The /api/admin/add-missing-payment endpoint might not be available yet.');
    console.log('Please make sure you have deployed the updated server.js to Render.');
    console.log('\n📋 Steps to deploy:');
    console.log('1. git add server.js');
    console.log('2. git commit -m "Add automatic tracking for all payments"');
    console.log('3. git push origin master');
    console.log('4. Wait 2-3 minutes for Render to deploy');
    console.log('5. Run this script again');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMissingPayment();