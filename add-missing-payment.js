const fs = require('fs');
const path = require('path');

// Read the current data
const dataFile = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Add the missing payment
const payment = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    email: "katungu1@gmail.com",
    amount: 300,
    paymentMethod: "mpesa",
    serviceType: "textToVideo",
    reference: "MPESA-2026-07-21-001",
    status: "completed",
    createdAt: new Date().toISOString()
};

data.userPayments.push(payment);

// Add to revenue
const revenue = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    transactionId: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    email: "katungu1@gmail.com",
    amount: 300,
    serviceType: "textToVideo",
    paymentReference: "MPESA-2026-07-21-001",
    paymentMethod: "mpesa",
    createdAt: new Date().toISOString()
};

data.revenue.push(revenue);

// Add activity log
data.activityLog.push({
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    userEmail: "katungu1@gmail.com",
    action: "💰 Manual payment added",
    details: "Amount: KES 300 via mpesa",
    amount: 300,
    createdAt: new Date().toISOString()
});

// Save back to file
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log('✅ Payment added successfully!');
console.log(`💰 Total Revenue: ${data.revenue.reduce((sum, r) => sum + r.amount, 0)}`);
console.log(`📊 Total Videos: ${data.videoUsage.length}`);