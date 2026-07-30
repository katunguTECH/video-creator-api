// ============================================
// LOAD ENVIRONMENT VARIABLES
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mailgun = require('mailgun-js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');
const Groq = require('groq-sdk');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');

// ============================================
// MONGODB ATLAS CONNECTION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'video-creator';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment. Set it in Render → Environment.');
}

console.log('🔑 MongoDB Atlas configured');
console.log(`📊 Database: ${DATABASE_NAME}`);

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4
};

let isMongoConnected = false;

async function connectToMongo() {
  if (!MONGODB_URI) {
    console.warn('⚠️ Skipping MongoDB connection: MONGODB_URI not set');
    return false;
  }
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    const dbName = mongoose.connection.db?.databaseName || DATABASE_NAME;
    console.log('✅ MongoDB Atlas connected successfully!');
    console.log(`   Database: ${dbName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    isMongoConnected = true;
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️ Running without MongoDB - using in-memory storage for coupons and logs');
    isMongoConnected = false;
    return false;
  }
}

// Connect immediately (don't block server startup)
connectToMongo();

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
  isMongoConnected = false;
});

db.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Running in fallback mode.');
  isMongoConnected = false;
});

db.on('reconnected', () => {
  console.log('✅ MongoDB reconnected!');
  isMongoConnected = true;
});

// ============================================
// IN-MEMORY FALLBACK STORAGE (When MongoDB is down)
// ============================================

const memoryStore = {
  coupons: {},
  payments: [],
  revenues: [],
  videoUsages: [],
  activityLogs: [],
  translations: []
};

// ============================================
// ✅ PRE-CREATE TEST COUPON FOR katungu1@gmail.com
// ============================================
const TEST_COUPON = 'REDO-KATUNGU-001';
memoryStore.coupons[TEST_COUPON] = {
  code: TEST_COUPON,
  paymentReference: 'MANUAL-PAYMENT-001',
  email: 'katungu1@gmail.com',
  serviceType: 'photo-to-video',
  used: false,
  usedAt: null,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  createdAt: new Date().toISOString()
};
console.log(`✅ Test coupon created: ${TEST_COUPON} for katungu1@gmail.com`);

// Also create a generic test coupon
const GENERIC_COUPON = 'REDO-TEST-001';
memoryStore.coupons[GENERIC_COUPON] = {
  code: GENERIC_COUPON,
  paymentReference: 'MANUAL-PAYMENT-002',
  email: 'test@example.com',
  serviceType: 'photo-to-video',
  used: false,
  usedAt: null,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString()
};
console.log(`✅ Generic test coupon created: ${GENERIC_COUPON}`);

// ============================================
// MONGODB SCHEMAS AND MODELS
// ============================================

let InitialBalance, ApiLedger, Revenue, VideoUsage, UserPayment, Translation, ActivityLog, SiteVisit, Coupon;

try {
  const initialBalanceSchema = new mongoose.Schema({
    provider: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, default: 0 }
  });

  const apiLedgerSchema = new mongoose.Schema({
    provider: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['purchase', 'usage'], required: true },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  });

  const revenueSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    serviceType: { type: String, required: true },
    paymentReference: { type: String },
    paymentMethod: { type: String, default: 'card' },
    duration: { type: Number, default: 5 },
    createdAt: { type: Date, default: Date.now }
  });

  const videoUsageSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    userEmail: { type: String, default: 'anonymous' },
    videoType: { type: String, required: true },
    prompt: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    modelUsed: { type: String, default: 'unknown' },
    provider: { type: String, default: 'unknown' },
    duration: { type: Number, default: 5 },
    createdAt: { type: Date, default: Date.now }
  });

  const userPaymentSchema = new mongoose.Schema({
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    serviceType: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    status: { type: String, default: 'completed' },
    createdAt: { type: Date, default: Date.now }
  });

  const translationSchema = new mongoose.Schema({
    paymentReference: { type: String, required: true },
    email: { type: String, required: true },
    videoUrl: { type: String, required: true },
    targetLanguage: { type: String, required: true },
    sourceLanguage: { type: String, default: 'en' },
    translatedText: { type: String },
    translatedVideoUrl: { type: String },
    duration: { type: Number, default: 5 },
    price: { type: Number, default: 300 },
    createdAt: { type: Date, default: Date.now }
  });

  const activityLogSchema = new mongoose.Schema({
    userEmail: { type: String, default: 'anonymous' },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  });

  const siteVisitSchema = new mongoose.Schema({
    page: { type: String, required: true },
    ip: { type: String, default: 'unknown' },
    userAgent: { type: String, default: 'unknown' },
    createdAt: { type: Date, default: Date.now }
  });

  const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    paymentReference: { type: String, required: true },
    email: { type: String, required: true },
    serviceType: { type: String, default: 'photo-to-video' },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  });

  InitialBalance = mongoose.model('InitialBalance', initialBalanceSchema);
  ApiLedger = mongoose.model('ApiLedger', apiLedgerSchema);
  Revenue = mongoose.model('Revenue', revenueSchema);
  VideoUsage = mongoose.model('VideoUsage', videoUsageSchema);
  UserPayment = mongoose.model('UserPayment', userPaymentSchema);
  Translation = mongoose.model('Translation', translationSchema);
  ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
  SiteVisit = mongoose.model('SiteVisit', siteVisitSchema);
  Coupon = mongoose.model('Coupon', couponSchema);
} catch (error) {
  console.warn('⚠️ Could not initialize MongoDB models:', error.message);
}

// ============================================
// DATA ACCESS FUNCTIONS - WITH FALLBACK
// ============================================

async function initializeBalances() {
  if (!isMongoConnected || !InitialBalance) {
    console.warn('⚠️ MongoDB not connected, skipping balance initialization');
    return;
  }

  try {
    const defaultBalances = [
      { provider: 'replicate', balance: parseFloat(process.env.REPLICATE_BALANCE) || 10.00 },
      { provider: 'byteplus', balance: parseFloat(process.env.BYTEPLUS_BALANCE) || 29.40 }
    ];

    for (const balance of defaultBalances) {
      await InitialBalance.findOneAndUpdate(
        { provider: balance.provider },
        { balance: balance.balance },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Initial balances initialized');
  } catch (error) {
    console.error('❌ Error initializing balances:', error.message);
  }
}

db.once('open', () => {
  setTimeout(initializeBalances, 1000);
});

async function addApiTransaction(provider, amount, type, description) {
  if (!isMongoConnected || !ApiLedger) {
    console.warn('⚠️ MongoDB not connected, skipping API transaction');
    return null;
  }

  try {
    const entry = new ApiLedger({
      provider,
      amount: parseFloat(amount),
      type,
      description: description || ''
    });
    await entry.save();
    return entry.id;
  } catch (error) {
    console.error('❌ Error adding API transaction:', error.message);
    return null;
  }
}

async function getApiBalance(provider) {
  if (!isMongoConnected || !InitialBalance) {
    console.warn('⚠️ MongoDB not connected, returning default balance');
    return 0;
  }

  try {
    const initialBalance = await InitialBalance.findOne({ provider });
    const initial = initialBalance ? initialBalance.balance : 0;

    const transactions = await ApiLedger.find({ provider });
    const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalUsage = transactions.filter(t => t.type === 'usage').reduce((sum, t) => sum + t.amount, 0);

    return Math.round((initial + totalPurchases - totalUsage) * 100) / 100;
  } catch (error) {
    console.error('❌ Error getting API balance:', error.message);
    return 0;
  }
}

async function getApiBalances() {
  const replicate = await getApiBalance('replicate');
  const byteplus = await getApiBalance('byteplus');
  return {
    replicate: replicate,
    byteplus: byteplus,
    total: Math.round((replicate + byteplus) * 100) / 100
  };
}

async function addUserPayment(email, amount, paymentMethod, serviceType, reference) {
  memoryStore.payments.push({
    email,
    amount: parseFloat(amount),
    paymentMethod,
    serviceType,
    reference,
    status: 'completed',
    createdAt: new Date().toISOString()
  });

  if (!isMongoConnected || !UserPayment) {
    console.warn('⚠️ MongoDB not connected, payment stored in memory only');
    return 'memory-' + Date.now();
  }

  try {
    const entry = new UserPayment({
      email,
      amount: parseFloat(amount),
      paymentMethod,
      serviceType,
      reference
    });
    await entry.save();
    return entry.id;
  } catch (error) {
    console.error('❌ Error adding user payment:', error.message);
    return 'memory-' + Date.now();
  }
}

async function addRevenue(transactionId, email, amount, serviceType, paymentReference, paymentMethod) {
  memoryStore.revenues.push({
    transactionId,
    email,
    amount: parseFloat(amount),
    serviceType,
    paymentReference,
    paymentMethod: paymentMethod || 'card',
    duration: 5,
    createdAt: new Date().toISOString()
  });

  if (!isMongoConnected || !Revenue) {
    console.warn('⚠️ MongoDB not connected, revenue stored in memory only');
    return 'memory-' + Date.now();
  }

  try {
    const entry = new Revenue({
      transactionId,
      email,
      amount: parseFloat(amount),
      serviceType,
      paymentReference,
      paymentMethod: paymentMethod || 'card'
    });
    await entry.save();
    return entry.id;
  } catch (error) {
    console.error('❌ Error adding revenue:', error.message);
    return 'memory-' + Date.now();
  }
}

async function addVideoUsage(transactionId, userEmail, videoType, prompt, cost, modelUsed, provider, duration) {
  memoryStore.videoUsages.push({
    transactionId,
    userEmail: userEmail || 'anonymous',
    videoType,
    prompt: prompt ? prompt.substring(0, 200) : '',
    cost: cost || 0,
    modelUsed: modelUsed || 'unknown',
    provider: provider || 'unknown',
    duration: duration || 5,
    createdAt: new Date().toISOString()
  });

  if (!isMongoConnected || !VideoUsage) {
    console.warn('⚠️ MongoDB not connected, video usage stored in memory only');
    return 'memory-' + Date.now();
  }

  try {
    const entry = new VideoUsage({
      transactionId,
      userEmail: userEmail || 'anonymous',
      videoType,
      prompt: prompt ? prompt.substring(0, 200) : '',
      cost: cost || 0,
      modelUsed: modelUsed || 'unknown',
      provider: provider || 'unknown',
      duration: duration || 5
    });
    await entry.save();
    return entry.id;
  } catch (error) {
    console.error('❌ Error adding video usage:', error.message);
    return 'memory-' + Date.now();
  }
}

async function addActivityLog(userEmail, action, details, amount) {
  memoryStore.activityLogs.push({
    userEmail: userEmail || 'anonymous',
    action,
    details: details || '',
    amount: amount || 0,
    createdAt: new Date().toISOString()
  });

  if (!isMongoConnected || !ActivityLog) {
    console.warn('⚠️ MongoDB not connected, activity log stored in memory only');
    return 'memory-' + Date.now();
  }

  try {
    const entry = new ActivityLog({
      userEmail: userEmail || 'anonymous',
      action,
      details: details || '',
      amount: amount || 0
    });
    await entry.save();

    const count = await ActivityLog.countDocuments();
    if (count > 1000) {
      const oldest = await ActivityLog.findOne().sort({ createdAt: 1 });
      if (oldest) await ActivityLog.deleteOne({ _id: oldest._id });
    }

    return entry.id;
  } catch (error) {
    console.error('❌ Error adding activity log:', error.message);
    return 'memory-' + Date.now();
  }
}

async function recordSiteVisit(page, ip, userAgent) {
  if (!isMongoConnected || !SiteVisit) {
    return null;
  }

  try {
    const entry = new SiteVisit({
      page,
      ip: ip || 'unknown',
      userAgent: userAgent || 'unknown'
    });
    await entry.save();

    const count = await SiteVisit.countDocuments();
    if (count > 5000) {
      const oldest = await SiteVisit.findOne().sort({ createdAt: 1 });
      if (oldest) await SiteVisit.deleteOne({ _id: oldest._id });
    }

    return entry.id;
  } catch (error) {
    return null;
  }
}

async function getRevenueByService() {
  if (!isMongoConnected || !Revenue) {
    const total = memoryStore.revenues.reduce((sum, r) => sum + r.amount, 0);
    return { total, textToVideo: 0, photoToVideo: 0, translation: 0 };
  }

  try {
    const textToVideo = await Revenue.aggregate([
      { $match: { serviceType: 'textToVideo' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const photoToVideo = await Revenue.aggregate([
      { $match: { serviceType: 'photoToVideo' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const translation = await Revenue.aggregate([
      { $match: { serviceType: 'translation' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const textTotal = textToVideo[0]?.total || 0;
    const photoTotal = photoToVideo[0]?.total || 0;
    const translationTotal = translation[0]?.total || 0;

    return {
      total: textTotal + photoTotal + translationTotal,
      textToVideo: textTotal,
      photoToVideo: photoTotal,
      translation: translationTotal
    };
  } catch (error) {
    console.error('❌ Error getting revenue by service:', error.message);
    return { total: 0, textToVideo: 0, photoToVideo: 0, translation: 0 };
  }
}

async function getVideoUsage() {
  if (!isMongoConnected || !VideoUsage) {
    return { totalVideos: memoryStore.videoUsages.length, textToVideo: 0, photoToVideo: 0, translation: 0 };
  }

  try {
    const textToVideo = await VideoUsage.countDocuments({ videoType: 'text-to-video' });
    const photoToVideo = await VideoUsage.countDocuments({ videoType: 'photo-to-video' });
    const translation = await VideoUsage.countDocuments({ videoType: 'translation' });

    return {
      totalVideos: textToVideo + photoToVideo + translation,
      textToVideo,
      photoToVideo,
      translation
    };
  } catch (error) {
    console.error('❌ Error getting video usage:', error.message);
    return { totalVideos: 0, textToVideo: 0, photoToVideo: 0, translation: 0 };
  }
}

async function getSiteVisits() {
  if (!isMongoConnected || !SiteVisit) return 0;
  try {
    return await SiteVisit.countDocuments();
  } catch (error) {
    return 0;
  }
}

async function getRecentActivity(limit = 10) {
  if (!isMongoConnected || !ActivityLog) {
    return memoryStore.activityLogs.slice(-limit).map(log => ({
      id: 'memory-' + Date.now(),
      user: log.userEmail || 'Anonymous',
      action: log.action,
      details: log.details || '',
      amount: log.amount || 0,
      time: log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'
    }));
  }

  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    return logs.map(log => ({
      id: log._id,
      user: log.userEmail || 'Anonymous',
      action: log.action,
      details: log.details || '',
      amount: log.amount || 0,
      time: log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'
    }));
  } catch (error) {
    console.error('❌ Error getting recent activity:', error.message);
    return [];
  }
}

async function getUserPayments(limit = 20) {
  if (!isMongoConnected || !UserPayment) {
    return memoryStore.payments.slice(-limit).map(p => ({
      id: 'memory-' + Date.now(),
      email: p.email,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      serviceType: p.serviceType,
      reference: p.reference,
      status: p.status,
      createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Just now'
    }));
  }

  try {
    const payments = await UserPayment.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    return payments.map(payment => ({
      id: payment._id,
      email: payment.email,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      serviceType: payment.serviceType,
      reference: payment.reference,
      status: payment.status,
      createdAt: payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'Just now'
    }));
  } catch (error) {
    console.error('❌ Error getting user payments:', error.message);
    return [];
  }
}

async function findPaymentByReference(reference) {
  if (!isMongoConnected || !UserPayment) {
    return memoryStore.payments.find(p => p.reference === reference) || null;
  }

  try {
    return await UserPayment.findOne({ reference });
  } catch (error) {
    console.error('❌ Error finding payment by reference:', error.message);
    return null;
  }
}

async function getTranslations(email) {
  if (!isMongoConnected || !Translation) {
    return memoryStore.translations.filter(t => !email || t.email === email).slice(-20);
  }

  try {
    const query = email ? { email } : {};
    return await Translation.find(query)
      .sort({ createdAt: -1 })
      .limit(20);
  } catch (error) {
    console.error('❌ Error getting translations:', error.message);
    return [];
  }
}

async function saveTranslation(translationData) {
  memoryStore.translations.push(translationData);

  if (!isMongoConnected || !Translation) {
    console.warn('⚠️ MongoDB not connected, translation stored in memory only');
    return translationData;
  }

  try {
    const entry = new Translation(translationData);
    await entry.save();
    return entry;
  } catch (error) {
    console.error('❌ Error saving translation:', error.message);
    return translationData;
  }
}

// ============================================
// COUPON FUNCTIONS - WITH FALLBACK
// ============================================

async function generateCoupon(paymentReference, email, serviceType) {
  const couponCode = `REDO-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  memoryStore.coupons[couponCode] = {
    code: couponCode,
    paymentReference,
    email,
    serviceType: serviceType || 'photo-to-video',
    used: false,
    usedAt: null,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  if (!isMongoConnected || !Coupon) {
    console.log(`✅ Coupon generated (memory): ${couponCode} for ${email}`);
    return couponCode;
  }

  try {
    const existingCoupon = await Coupon.findOne({ paymentReference });
    if (existingCoupon) {
      return existingCoupon.code;
    }

    const coupon = new Coupon({
      code: couponCode,
      paymentReference,
      email,
      serviceType: serviceType || 'photo-to-video',
      expiresAt
    });

    await coupon.save();
    console.log(`✅ Coupon generated (MongoDB): ${couponCode} for ${email}`);
    return couponCode;
  } catch (error) {
    console.error('❌ Error generating coupon in MongoDB:', error.message);
    return couponCode;
  }
}

async function validateCoupon(couponCode, email) {
  if (memoryStore.coupons[couponCode]) {
    const coupon = memoryStore.coupons[couponCode];
    if (coupon.used) {
      return { valid: false, error: 'This coupon has already been used' };
    }
    if (new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, error: 'Coupon has expired' };
    }
    if (email && coupon.email !== email) {
      return { valid: false, error: 'Coupon not valid for this email' };
    }
    return { valid: true, coupon, source: 'memory' };
  }

  if (!isMongoConnected || !Coupon) {
    return { valid: false, error: 'Coupon not found' };
  }

  try {
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    if (coupon.used) {
      return { valid: false, error: 'This coupon has already been used' };
    }

    if (new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, error: 'Coupon has expired' };
    }

    if (email && coupon.email !== email) {
      return { valid: false, error: 'Coupon not valid for this email' };
    }

    return { valid: true, coupon, source: 'mongodb' };
  } catch (error) {
    console.error('❌ Error validating coupon:', error.message);
    return { valid: false, error: 'Error validating coupon' };
  }
}

async function redeemCoupon(couponCode, email) {
  if (memoryStore.coupons[couponCode]) {
    const coupon = memoryStore.coupons[couponCode];
    if (coupon.used) {
      return { success: false, error: 'This coupon has already been used' };
    }
    if (new Date(coupon.expiresAt) < new Date()) {
      return { success: false, error: 'Coupon has expired' };
    }
    coupon.used = true;
    coupon.usedAt = new Date().toISOString();
    return { success: true, coupon, source: 'memory' };
  }

  if (!isMongoConnected || !Coupon) {
    return { success: false, error: 'Coupon not found' };
  }

  try {
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      return { success: false, error: 'Invalid coupon code' };
    }

    if (coupon.used) {
      return { success: false, error: 'This coupon has already been used' };
    }

    if (new Date(coupon.expiresAt) < new Date()) {
      return { success: false, error: 'Coupon has expired' };
    }

    coupon.used = true;
    coupon.usedAt = new Date();
    await coupon.save();

    return { success: true, coupon, source: 'mongodb' };
  } catch (error) {
    console.error('❌ Error redeeming coupon:', error.message);
    return { success: false, error: 'Error redeeming coupon' };
  }
}

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary env vars not fully set (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)');
} else {
  console.log('☁️ Cloudinary configured successfully!');
}

// ============================================
// GOOGLE CLOUD CONFIGURATION
// ============================================

const googleApiKey = process.env.GOOGLE_API_KEY;
console.log('🔑 Google API Key configured:', googleApiKey ? '✅' : '❌');

async function translateText(text, targetLanguage) {
  try {
    if (!googleApiKey) {
      console.warn('⚠️ No Google API key found, using fallback');
      const languageMap = { 'fr': 'French', 'es': 'Spanish', 'sw': 'Swahili', 'en': 'English' };
      return `[Translated to ${languageMap[targetLanguage] || targetLanguage}] ${text}`;
    }

    console.log(`🌐 Translating to ${targetLanguage}...`);
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2`,
      null,
      {
        params: {
          q: text,
          target: targetLanguage,
          key: googleApiKey,
          format: 'text'
        },
        timeout: 10000
      }
    );

    if (response.data?.data?.translations?.length > 0) {
      const translation = response.data.data.translations[0].translatedText;
      console.log('✅ Translation complete');
      return translation;
    }
    throw new Error('No translation returned');
  } catch (error) {
    console.error('❌ Translation API error:', error.message);
    const languageMap = { 'fr': 'French', 'es': 'Spanish', 'sw': 'Swahili', 'en': 'English' };
    return `[Translated to ${languageMap[targetLanguage] || targetLanguage}] ${text}`;
  }
}

// ============================================
// TEXT-TO-SPEECH
// ============================================
async function textToSpeech(text, targetLanguage, speakingRate = 1.0) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API key not configured for text-to-speech');
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const voiceMap = {
      'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'it': 'it-IT',
      'pt': 'pt-PT', 'ru': 'ru-RU', 'ja': 'ja-JP', 'ko': 'ko-KR',
      'zh': 'cmn-CN', 'ar': 'ar-XA', 'hi': 'hi-IN', 'sw': 'sw-KE',
      'en': 'en-US'
    };
    const languageCode = voiceMap[targetLanguage] || 'en-US';

    const clampedRate = Math.min(Math.max(speakingRate, 0.25), 4.0);

    const requestBody = {
      input: { text: text },
      voice: { languageCode: languageCode, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: clampedRate }
    };

    console.log(`🔊 Calling TTS API for language: ${targetLanguage} (${languageCode}), rate: ${clampedRate}`);
    console.log(`📝 Text length: ${text.length} characters`);

    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data && response.data.audioContent) {
      console.log(`✅ TTS API call successful (${response.data.audioContent.length} bytes)`);
      return Buffer.from(response.data.audioContent, 'base64');
    }
    throw new Error('No audio content returned');
  } catch (error) {
    console.error('❌ TTS error:', error.response?.data?.error?.message || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`TTS failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// GROQ CONFIGURATION
// ============================================

let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key') {
  try {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    console.log('✅ Groq client initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Groq:', error.message);
  }
} else {
  console.warn('⚠️ GROQ_API_KEY not set. Transcription will use fallback.');
}

// ============================================
// FFMPEG CONFIGURATION
// ============================================

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('✅ FFmpeg configured');

// ============================================
// REPLICATE TOKEN VALIDATION (STARTUP)
// ============================================
// FIX: previously a bad/expired REPLICATE_API_TOKEN only surfaced as a
// 401 buried deep in a user's failed generation log. This check runs once
// at boot and calls Replicate's account endpoint so a dead token shows up
// immediately in the deploy logs, not on someone's first request.
//
// NOTE: this validation cannot repair an invalid or revoked token — that
// requires generating a new one at https://replicate.com/account/api-tokens
// and updating REPLICATE_API_TOKEN in Render → Environment. This just
// makes the failure loud and early instead of silent and late.
async function validateReplicateTokenAtStartup() {
  const rawToken = process.env.REPLICATE_API_TOKEN || '';
  const token = rawToken.trim();

  if (!token) {
    console.warn('⚠️ REPLICATE_API_TOKEN not set — text-to-video and the photo-to-video final fallback will be unavailable.');
    return;
  }

  if (rawToken !== token) {
    console.warn('⚠️ REPLICATE_API_TOKEN has leading/trailing whitespace — trimmed automatically, but clean up the env var value.');
  }

  if (!token.startsWith('r8_')) {
    console.warn(`⚠️ REPLICATE_API_TOKEN does not start with the expected "r8_" prefix (starts with "${token.substring(0, 3)}..."). Double-check you copied the correct token.`);
  }

  try {
    const res = await fetch('https://api.replicate.com/v1/account', {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (res.status === 401) {
      console.error('❌ REPLICATE_API_TOKEN is INVALID or EXPIRED (401 from /v1/account).');
      console.error('   → Regenerate at https://replicate.com/account/api-tokens and update it in Render → Environment, then redeploy.');
      return;
    }

    if (!res.ok) {
      console.warn(`⚠️ Replicate token check returned unexpected status ${res.status} — continuing, but this may indicate an account issue.`);
      return;
    }

    const account = await res.json();
    console.log(`✅ Replicate token verified at startup (account: ${account.username || account.name || 'unknown'})`);
  } catch (error) {
    console.warn('⚠️ Could not verify Replicate token at startup (network error):', error.message);
  }
}

validateReplicateTokenAtStartup();

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = [
  'https://www.katareel.com',
  'https://katareel.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://video-creator-api-kjzy.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());

// ============================================
// FALLBACK CORS MIDDLEWARE
// ============================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://www.katareel.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (!req.path.startsWith('/api')) {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    await recordSiteVisit(req.path, ip, req.headers['user-agent']);
  }
  next();
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// ============================================
// CREATE TEMP DIRECTORY FOR VIDEO PROCESSING
// ============================================

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('📁 Temp directory created:', tempDir);
}

// ============================================
// EMAIL CONFIGURATION - Mailgun
// ============================================

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'katareel.com';

let mg = null;
let emailProvider = 'none';

if (MAILGUN_API_KEY && MAILGUN_API_KEY !== 'your_mailgun_api_key') {
  try {
    mg = mailgun({
      apiKey: MAILGUN_API_KEY,
      domain: MAILGUN_DOMAIN,
      host: 'api.mailgun.net'
    });
    emailProvider = 'mailgun';
    console.log('📧 Mailgun configured successfully!');
    console.log(`   Domain: ${MAILGUN_DOMAIN}`);
    console.log(`   From: VidAI Creator <noreply@${MAILGUN_DOMAIN}>`);
  } catch (error) {
    console.error('❌ Mailgun configuration error:', error.message);
  }
}

let transporter = null;
if (!mg) {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

  if (EMAIL_USER && EMAIL_PASSWORD && EMAIL_USER !== 'your-email@gmail.com') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
    emailProvider = 'gmail';
    console.log('📧 Gmail configured as fallback!');
  } else {
    console.warn('⚠️ No email provider configured. Email sending will be disabled.');
  }
}

async function sendEmail(to, subject, html, text) {
  const fromEmail = process.env.EMAIL_FROM || `noreply@${MAILGUN_DOMAIN}`;
  const fromName = 'VidAI Creator';

  console.log(`📧 Sending email to ${to} via ${emailProvider.toUpperCase()}`);

  if (emailProvider === 'none') {
    const msg = 'No email provider configured on the server (missing MAILGUN_API_KEY or EMAIL_USER/EMAIL_PASSWORD env vars)';
    console.error(`❌ ${msg}`);
    return { success: false, provider: 'none', error: msg };
  }

  let lastError = null;

  if (emailProvider === 'mailgun' && mg) {
    try {
      const data = {
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const result = await new Promise((resolve, reject) => {
        mg.messages().send(data, (error, body) => {
          if (error) reject(error);
          else resolve(body);
        });
      });

      console.log(`✅ Email sent via Mailgun to ${to}`);
      console.log(`   Message ID: ${result.id}`);
      return { success: true, provider: 'mailgun', id: result.id };
    } catch (error) {
      console.error('❌ Mailgun error:', error.message);
      if (error.statusCode) console.error('   Mailgun status code:', error.statusCode);
      lastError = `Mailgun error: ${error.message}`;
    }
  }

  if (emailProvider === 'gmail' && transporter) {
    try {
      const mailOptions = {
        from: `${fromName} <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent via Gmail to ${to}`);
      console.log(`   Message ID: ${info.messageId}`);
      return { success: true, provider: 'gmail', id: info.messageId };
    } catch (error) {
      console.error('❌ Gmail error:', error.message);
      lastError = `Gmail error: ${error.message}`;
    }
  }

  console.error(`❌ Failed to send email to ${to}: ${lastError || 'unknown error'}`);
  return { success: false, provider: emailProvider, error: lastError || 'No email provider available' };
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generatePaymentReceiptEmail(email, amount, reference, serviceType, duration) {
  const serviceLabels = {
    'textToVideo': 'Text to Video',
    'photoToVideo': 'Photos to Video',
    'translation': 'Video Translation'
  };

  return {
    subject: '🧾 Payment Confirmation - VidAI Creator',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; }
          .total { font-weight: bold; font-size: 18px; color: #8B5CF6; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .status-badge { background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧾 Payment Receipt</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Thank you for your payment! Your transaction has been completed successfully. 🎉</p>

          <div class="receipt-box">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <div class="receipt-row">
              <span>Transaction ID</span>
              <span><strong>${reference}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Service</span>
              <span><strong>${serviceLabels[serviceType] || serviceType}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Duration</span>
              <span><strong>${duration || 5}s</strong></span>
            </div>
            <div class="receipt-row">
              <span>Status</span>
              <span><span class="status-badge">✅ Completed</span></span>
            </div>
            <div class="receipt-row">
              <span class="total">Total Paid</span>
              <span class="total">KES ${amount}</span>
            </div>
          </div>

          <p style="margin-top: 20px;">Your video is being generated and will be sent to you shortly.</p>
          <p>If you have any questions, please reply to this email.</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This is a system-generated receipt. Please keep it for your records.</p>
        </div>
      </body>
      </html>
    `
  };
}

function generateVideoDeliveryEmail(email, videoUrl, prompt, amount, duration) {
  const downloadUrl = videoUrl.includes('/upload/')
    ? videoUrl.replace('/upload/', '/upload/fl_attachment/')
    : videoUrl;

  return {
    subject: '🎬 Your AI Video is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .video-container video { width: 100%; max-height: 400px; }
          .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .download-section {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎬 Your AI Video is Ready!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your AI-generated video has been created successfully! 🎉</p>

          <div class="details">
            <p><strong>📝 Prompt:</strong> ${prompt}</p>
            <p><strong>⏱️ Duration:</strong> ${duration || 5}s</p>
            <p><strong>💰 Amount Paid:</strong> KES ${amount}</p>
          </div>

          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>

          <div class="download-section">
            <h3>📥 Download Your Video</h3>
            <p style="font-size: 16px; margin: 10px 0;">
              Click the button below to download your video
            </p>
            <a href="${downloadUrl}" class="button" style="font-size: 18px; padding: 15px 40px;">
              ⬇️ Download Video
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: <br>
              <a href="${downloadUrl}" style="word-break: break-all; font-size: 12px;">${downloadUrl}</a>
            </p>
          </div>

          <p style="margin-top: 20px;">Thank you for using VidAI Creator! 🚀</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}. If you have any questions, reply to this email.</p>
        </div>
      </body>
      </html>
    `
  };
}

function generateTranslationEmail(email, videoUrl, translatedText, language, amount) {
  const downloadUrl = videoUrl.includes('/upload/')
    ? videoUrl.replace('/upload/', '/upload/fl_attachment/')
    : videoUrl;

  return {
    subject: `🌐 Your Translated Video is Ready! (${language})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .video-container video { width: 100%; max-height: 400px; }
          .translation-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #8B5CF6; }
          .language-badge { display: inline-block; background: #EC4899; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
          .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .receipt-box { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .download-section {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌐 Your Translated Video is Ready!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your video has been successfully translated to <span class="language-badge">${language}</span> 🎉</p>

          <div class="translation-box">
            <h4 style="margin-top: 0;">📝 Translated Content:</h4>
            <p style="font-size: 14px; color: #666;">"${translatedText}"</p>
          </div>

          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>

          <div class="download-section">
            <h3>📥 Download Your Translated Video</h3>
            <p style="font-size: 16px; margin: 10px 0;">
              Click the button below to download your video
            </p>
            <a href="${downloadUrl}" class="button" style="font-size: 18px; padding: 15px 40px;">
              ⬇️ Download Video
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: <br>
              <a href="${downloadUrl}" style="word-break: break-all; font-size: 12px;">${downloadUrl}</a>
            </p>
          </div>

          <div class="receipt-box">
            <h3>🧾 Payment Receipt</h3>
            <p><strong>Service:</strong> Video Translation</p>
            <p><strong>Language:</strong> ${language}</p>
            <p><strong>Amount Paid:</strong> KES ${amount}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> ✅ Completed</p>
          </div>

          <p style="margin-top: 20px;">Thank you for using VidAI Creator! 🚀</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}. If you have any questions, reply to this email.</p>
        </div>
      </body>
      </html>
    `
  };
}

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];
    const allowedExtensions = ['.mp4', '.avi', '.mov', '.webm'];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(fileExt);

    if (isValidType || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: MP4, AVI, MOV, WEBM. Got: ${file.mimetype || fileExt}`), false);
    }
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Uploads directory created:', uploadsDir);
}

app.post('/api/upload-video', (req, res) => {
  console.log('📤 Upload request received');
  console.log('📤 Content-Type:', req.headers['content-type']);
  console.log('📤 Content-Length:', req.headers['content-length']);

  req.setTimeout(300000);
  res.setTimeout(300000);

  upload.single('video')(req, res, async function(err) {
    res.setTimeout(0);

    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed'
      });
    }

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded. Please select a video file.'
      });
    }

    try {
      const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);
      console.log('✅ Video received, uploading to Cloudinary...');

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
          resource_type: 'video',
          folder: 'video-creator-uploads',
          public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });

        uploadStream.end(req.file.buffer);
      });

      console.log('✅ Video uploaded to Cloudinary successfully:');
      console.log(`   URL: ${result.secure_url}`);

      return res.status(200).json({
        success: true,
        videoUrl: result.secure_url,
        filename: result.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        sizeMB: parseFloat(fileSizeMB),
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('❌ Upload processing error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Server error processing upload: ' + error.message
      });
    }
  });
});

// ============================================
// VIDEO TRANSLATION PIPELINE FUNCTIONS
// ============================================

async function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

async function transcribeAudio(audioPath) {
  if (!groq) {
    console.log('⚠️ Groq not available, using fallback transcription');
    return "This is a sample transcription. The actual transcription service is not available.";
  }

  try {
    console.log('🎤 Transcribing with Groq...');
    const audioBuffer = fs.readFileSync(audioPath);
    const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'json'
    });

    console.log('✅ Transcription complete');
    return transcription.text;
  } catch (error) {
    console.error('❌ Transcription error:', error);
    return "This is a sample transcription for the video. The actual transcription failed, but we're continuing with the translation.";
  }
}

// ============================================
// SYNC FIX HELPERS
// ============================================

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

function buildAtempoFilter(ratio) {
  const filters = [];
  let remaining = ratio;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters.join(',');
}

async function combineAudioWithVideo(videoPath, audioBuffer, outputPath) {
  if (!audioBuffer || audioBuffer.length < 100) {
    throw new Error(`Invalid audio buffer: ${audioBuffer ? audioBuffer.length : 'null'} bytes`);
  }

  console.log(`🔊 Audio buffer size: ${audioBuffer.length} bytes`);

  const tempAudioPath = path.join(tempDir, `${crypto.randomUUID()}.mp3`);
  fs.writeFileSync(tempAudioPath, audioBuffer);

  const stats = fs.statSync(tempAudioPath);
  console.log(`📁 Audio file size: ${stats.size} bytes`);

  const videoDuration = await getDuration(videoPath);
  const audioDuration = await getDuration(tempAudioPath);
  console.log(`📏 Video: ${videoDuration.toFixed(2)}s | New audio: ${audioDuration.toFixed(2)}s`);

  let tempoRatio = audioDuration / videoDuration;
  tempoRatio = Math.min(Math.max(tempoRatio, 0.7), 1.4);
  const atempoFilter = buildAtempoFilter(tempoRatio);
  console.log(`🎚️ Applying tempo adjustment: ${tempoRatio.toFixed(3)}x (${atempoFilter})`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(tempAudioPath)
      .audioFilters([atempoFilter, 'apad'])
      .audioCodec('aac')
      .videoCodec('libx264')
      .outputOptions([
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-t', videoDuration.toString()
      ])
      .output(outputPath)
      .on('end', () => {
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        resolve();
      })
      .on('error', (err) => {
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        reject(err);
      })
      .run();
  });
}

async function generateTranslatedVideo(originalVideoUrl, targetLanguage, duration) {
  console.log(`🎬 Starting translation pipeline for ${targetLanguage}`);
  console.log(`📹 Original video: ${originalVideoUrl.substring(0, 100)}...`);

  const videoId = crypto.randomUUID();
  const videoPath = path.join(tempDir, `${videoId}.mp4`);
  const audioPath = path.join(tempDir, `${videoId}.wav`);
  const outputPath = path.join(tempDir, `${videoId}_translated.mp4`);

  try {
    console.log('📥 Downloading video...');
    const response = await fetch(originalVideoUrl);
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    const videoBuffer = await response.arrayBuffer();
    fs.writeFileSync(videoPath, Buffer.from(videoBuffer));
    console.log('✅ Video downloaded');

    console.log('🎵 Extracting audio...');
    await extractAudio(videoPath, audioPath);
    console.log('✅ Audio extracted');

    console.log('📝 Transcribing audio...');
    const transcribedText = await transcribeAudio(audioPath);
    console.log(`📝 Transcription (first 100 chars): ${transcribedText.substring(0, 100)}...`);

    console.log(`🌐 Translating to ${targetLanguage}...`);
    const translatedTextResult = await translateText(transcribedText, targetLanguage);
    console.log(`🌐 Translation (first 100 chars): ${translatedTextResult.substring(0, 100)}...`);

    const originalVideoDuration = await getDuration(videoPath);
    const estimatedWordCount = translatedTextResult.split(/\s+/).filter(Boolean).length;
    const estimatedNaturalDuration = estimatedWordCount / 2.5;
    let requestedRate = estimatedNaturalDuration > 0
      ? estimatedNaturalDuration / originalVideoDuration
      : 1.0;
    requestedRate = Math.min(Math.max(requestedRate, 0.8), 1.3);

    console.log('🔊 Generating translated audio...');
    const audioContent = await textToSpeech(translatedTextResult, targetLanguage, requestedRate);
    console.log('✅ Audio generated');

    console.log('🎬 Combining audio with video...');
    await combineAudioWithVideo(videoPath, audioContent, outputPath);
    console.log('✅ Video combined');

    console.log('☁️ Uploading to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
      resource_type: 'video',
      folder: 'video-creator-uploads',
      public_id: `${videoId}_translated_${targetLanguage}`
    });
    console.log('✅ Uploaded to Cloudinary');

    [videoPath, audioPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    console.log('✅ Translation pipeline complete!');
    return uploadResult.secure_url;

  } catch (error) {
    console.error('❌ Translation pipeline error:', error);
    [videoPath, audioPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    throw new Error(`Translation failed: ${error.message}`);
  }
}

// ============================================
// TRANSLATION ENDPOINTS
// ============================================

app.post('/api/translate-video', async (req, res) => {
  try {
    const {
      videoUrl,
      targetLanguage,
      sourceLanguage,
      paymentReference,
      email,
      text,
      duration
    } = req.body;

    const TRANSLATION_PRICE = 300;

    console.log('🌐 Translation request received:');
    console.log(`   Video URL: ${videoUrl ? videoUrl.substring(0, 50) + '...' : 'Not provided'}`);
    console.log(`   Target Language: ${targetLanguage} (${FREE_TRANSLATION_LANGUAGES[targetLanguage] || targetLanguage})`);
    console.log(`   User Email: ${email}`);
    console.log(`   Payment Reference: ${paymentReference}`);

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required for translation.',
        requiresPayment: true,
        price: TRANSLATION_PRICE
      });
    }

    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true,
        price: TRANSLATION_PRICE
      });
    }

    const translatedVideoUrl = await generateTranslatedVideo(
      videoUrl,
      targetLanguage || 'fr',
      duration || 5
    );

    const translationId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const translationRecord = {
      id: translationId,
      paymentReference,
      email,
      videoUrl,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'en',
      translatedText: `Video translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage] || 'French'}`,
      translatedVideoUrl,
      duration: duration || 5,
      price: TRANSLATION_PRICE,
      createdAt: new Date().toISOString()
    };

    await saveTranslation(translationRecord);

    const translationCost = TRANSLATION_PRICE;
    await addRevenue(translationId, email, translationCost, 'translation', paymentReference, 'card');
    await addUserPayment(email, translationCost, 'card', 'translation', paymentReference);
    await addActivityLog(email, '🌐 Video Translation', `Translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}, Duration: ${duration || 5}s, Price: KES ${TRANSLATION_PRICE}`, translationCost);
    await addVideoUsage(paymentReference, email, 'translation', `Video translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}`, translationCost, 'Translation Pipeline', 'google-groq', duration || 5);

    let emailResult = { success: false };
    try {
      const translationEmail = generateTranslationEmail(
        email,
        translatedVideoUrl,
        `Video translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}`,
        FREE_TRANSLATION_LANGUAGES[targetLanguage],
        translationCost
      );
      emailResult = await sendEmail(email, translationEmail.subject, translationEmail.html);
      console.log(`📧 Translation video sent to ${email}: ${emailResult.success}`);
    } catch (emailErr) {
      console.warn('⚠️ Could not send translation email:', emailErr.message);
      emailResult = { success: false, error: emailErr.message };
    }

    res.json({
      success: true,
      videoUrl: translatedVideoUrl,
      targetLanguage: targetLanguage,
      languageName: FREE_TRANSLATION_LANGUAGES[targetLanguage],
      duration: duration || 5,
      paymentReference,
      translationId,
      price: TRANSLATION_PRICE,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });

  } catch (error) {
    console.error('❌ Translation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/translate-video-free', async (req, res) => {
  try {
    const { videoUrl, targetLanguage, sourceLanguage, paymentReference, email, duration } = req.body;

    console.log('🔄 Free retry translation for:', email);
    console.log('📝 Payment Reference:', paymentReference);
    console.log('🎯 Target Language:', targetLanguage);

    const payment = await findPaymentByReference(paymentReference);

    if (!payment) {
      console.log('❌ Payment not found for reference:', paymentReference);
      return res.status(404).json({
        success: false,
        error: 'Payment not found. Please verify your payment reference.'
      });
    }

    console.log('✅ Payment found, proceeding with translation');

    const translatedVideoUrl = await generateTranslatedVideo(
      videoUrl,
      targetLanguage || 'fr',
      duration || 5
    );

    let emailResult = { success: false };
    try {
      const languageName = FREE_TRANSLATION_LANGUAGES[targetLanguage] || 'French';
      const translationEmail = generateTranslationEmail(
        email,
        translatedVideoUrl,
        `Video translated to ${languageName}`,
        languageName,
        300
      );
      emailResult = await sendEmail(email, translationEmail.subject, translationEmail.html);
      console.log(`📧 Email sent to ${email}: ${emailResult.success}`);
    } catch (emailErr) {
      console.error('❌ Email error:', emailErr);
      emailResult = { success: false, error: emailErr.message };
    }

    try {
      await sendReceiptEmail(email, 300, paymentReference, 'translation');
    } catch (receiptErr) {
      console.error('❌ Receipt error:', receiptErr);
    }

    res.json({
      success: true,
      message: '✅ Translation complete! Check your email for the download link.',
      videoUrl: translatedVideoUrl,
      paymentReference: paymentReference,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });

  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Translation failed. Please try again.'
    });
  }
});

app.post('/api/test-tts', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🔊 Testing TTS with text: "${text.substring(0, 50)}..."`);
    console.log(`📝 Target language: ${targetLanguage || 'fr'}`);

    const audioBuffer = await textToSpeech(text, targetLanguage || 'fr');

    res.json({
      success: true,
      audioLength: audioBuffer.length,
      audioBase64: audioBuffer.toString('base64').substring(0, 100) + '...',
      textLength: text.length,
      targetLanguage: targetLanguage || 'fr'
    });
  } catch (error) {
    console.error('❌ TTS test error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============================================
// PAYMENT ENDPOINTS
// ============================================

async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      console.log('⚠️ No secret key, accepting test payment');
      return true;
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status && data.data?.status === 'success';
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    return false;
  }
}

app.post('/api/initialize-payment', async (req, res) => {
  try {
    const { email, amount, serviceType, metadata } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log('💰 Initializing payment...');
    console.log('📧 Email:', email);
    console.log('💰 Amount:', amount);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!secretKey || secretKey === 'your_paystack_secret_key' || secretKey.length < 10) {
      console.error('❌ Invalid Paystack secret key.');
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error. Please contact support.'
      });
    }

    const requestBody = {
      email: email,
      amount: Math.round(amount * 100),
      metadata: {
        serviceType: serviceType || 'translation',
        ...metadata,
        custom_fields: [
          {
            display_name: "Service Type",
            variable_name: "service_type",
            value: serviceType || 'translation'
          },
          {
            display_name: "Amount",
            variable_name: "amount",
            value: `${amount} KES`
          },
          ...(metadata?.custom_fields || [])
        ]
      },
      callback_url: process.env.FRONTEND_URL || 'https://www.katareel.com/translation-success'
    };

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.status) {
      console.log('✅ Payment initialized successfully!');
      console.log('📝 Reference:', data.data.reference);

      return res.status(200).json({
        success: true,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        metadata: metadata
      });
    } else {
      console.error('❌ Paystack error:', data.message);
      return res.status(400).json({
        success: false,
        error: data.message || 'Payment initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment initialization failed. Please try again.'
    });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount, serviceType, paymentMethod, duration } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log(`🔍 Verifying payment: ${reference}`, { email, amount, serviceType, paymentMethod, duration });

    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set. Using test mode.');
      const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      const serviceMap = { 'text-to-video': 'textToVideo', 'photo-to-video': 'photoToVideo', 'translation': 'translation' };
      const serviceKey = serviceMap[serviceType] || 'textToVideo';

      await addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'card');
      await addUserPayment(email, amount, paymentMethod || 'card', serviceType, reference);
      await addActivityLog(email, `💰 Paid for ${serviceType}`, `Amount: KES ${amount} via ${paymentMethod || 'card'}, Duration: ${duration || 5}s`, amount);

      try {
        const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceKey, duration || 5);
        await sendEmail(email, receiptEmail.subject, receiptEmail.html);
      } catch (emailErr) {
        console.warn('⚠️ Could not send receipt email:', emailErr.message);
      }

      return res.json({
        success: true,
        data: { reference, status: 'success' },
        message: 'Payment verified successfully (test mode)',
        transactionId
      });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    console.log('📦 Paystack verification response:', data);

    if (data.status && data.data.status === 'success') {
      const serviceMap = { 'text-to-video': 'textToVideo', 'photo-to-video': 'photoToVideo', 'translation': 'translation' };
      const serviceKey = serviceMap[serviceType] || 'textToVideo';
      const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

      await addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'card');
      await addUserPayment(email, amount, paymentMethod || 'card', serviceType, reference);
      await addActivityLog(email, `💰 Paid for ${serviceType}`, `Amount: KES ${amount} via ${paymentMethod || 'card'}, Duration: ${duration || 5}s`, amount);

      try {
        const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceKey, duration || 5);
        await sendEmail(email, receiptEmail.subject, receiptEmail.html);
        console.log(`📧 Receipt email sent to ${email}`);
      } catch (emailErr) {
        console.warn('⚠️ Could not send receipt email:', emailErr.message);
      }

      res.json({
        success: true,
        data: data.data,
        message: 'Payment verified successfully',
        transactionId
      });
    } else {
      res.json({
        success: false,
        error: data.message || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;
    if (!secret) return res.sendStatus(200);

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');

    if (payload.event === 'charge.success') {
      const transaction = payload.data;
      console.log(`✅ Payment successful!`);
      console.log(`   Reference: ${transaction.reference}`);
      console.log(`   Amount: ${transaction.amount / 100} ${transaction.currency}`);
      console.log(`   Customer: ${transaction.customer.email}`);

      const amount = transaction.amount / 100;
      const email = transaction.customer.email;
      const reference = transaction.reference;
      const serviceType = transaction.metadata?.custom_fields?.find(f => f.display_name === "Video Type")?.value || 'text-to-video';
      const duration = parseInt(transaction.metadata?.custom_fields?.find(f => f.display_name === "Duration")?.value) || 5;

      addUserPayment(email, amount, 'card', serviceType, reference);
      addActivityLog(email, `💰 Payment received via webhook`, `Amount: KES ${amount}, Ref: ${reference}, Duration: ${duration}s`, amount);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).send('Webhook processing failed');
  }
});

app.post('/api/admin/add-missing-payment', async (req, res) => {
  try {
    const { email, amount, serviceType, paymentMethod, reference, duration } = req.body;

    console.log('📝 Adding missing payment:', { email, amount, serviceType, paymentMethod, duration });

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Email and amount are required'
      });
    }

    const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const serviceKey = serviceType || 'textToVideo';
    const method = paymentMethod || 'mpesa';
    const videoDuration = duration || 5;

    await addRevenue(transactionId, email, amount, serviceKey, reference || 'manual_' + Date.now(), method);
    await addUserPayment(email, amount, method, serviceKey, reference || 'manual_' + Date.now());
    await addActivityLog(email, `💰 Manual payment added`, `Amount: KES ${amount} via ${method}, Duration: ${videoDuration}s`, amount);

    const totalRevenueResult = await Revenue.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      message: `Payment of KES ${amount} added for ${email}`,
      transactionId,
      totalRevenue: totalRevenueResult[0]?.total || 0
    });
  } catch (error) {
    console.error('❌ Error adding missing payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/payments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const payments = await getUserPayments(limit);
    const total = isMongoConnected && UserPayment ? await UserPayment.countDocuments() : payments.length;
    const totalAmountResult = isMongoConnected && UserPayment
      ? await UserPayment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
      : [];

    res.json({
      success: true,
      payments: payments,
      total: total,
      totalAmount: totalAmountResult[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN DASHBOARD ENDPOINTS
// ============================================

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const balances = await getApiBalances();
    const revenue = await getRevenueByService();
    const usage = await getVideoUsage();
    const visits = await getSiteVisits();
    const activity = await getRecentActivity(10);
    const payments = await getUserPayments(10);
    const translations = isMongoConnected && Translation ? await Translation.countDocuments() : memoryStore.translations.length;

    let totalDuration = 0;
    let totalVideos = 0;
    if (isMongoConnected && VideoUsage) {
      const totalDurationResult = await VideoUsage.aggregate([
        { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
      ]);
      totalDuration = totalDurationResult[0]?.totalDuration || 0;
      totalVideos = await VideoUsage.countDocuments();
    } else {
      totalVideos = memoryStore.videoUsages.length;
      totalDuration = memoryStore.videoUsages.reduce((sum, v) => sum + (v.duration || 0), 0);
    }
    const avgDuration = totalVideos > 0 ? Math.round(totalDuration / totalVideos) : 0;

    res.json({
      credits: balances,
      revenue: {
        total: Math.round(revenue.total) || 0,
        textToVideo: Math.round(revenue.textToVideo) || 0,
        photoToVideo: Math.round(revenue.photoToVideo) || 0,
        translation: Math.round(revenue.translation) || 0
      },
      usage: {
        totalVideos: usage.totalVideos || 0,
        textToVideo: usage.textToVideo || 0,
        photoToVideo: usage.photoToVideo || 0,
        translation: usage.translation || 0,
        avgDuration: avgDuration
      },
      visits: {
        total: visits || 0,
        today: 0,
        week: 0,
        month: 0
      },
      recentActivity: activity,
      recentPayments: payments,
      translations: translations || 0,
      mongodb: {
        connected: isMongoConnected,
        database: DATABASE_NAME
      },
      emailProvider: emailProvider
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.post('/api/admin/add-credits', async (req, res) => {
  try {
    const { provider, amount, description } = req.body;
    if (!provider || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Provider and amount are required. Valid providers: replicate, byteplus'
      });
    }

    if (!['replicate', 'byteplus'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "replicate" or "byteplus"'
      });
    }

    await addApiTransaction(provider, parseFloat(amount), 'purchase', description || 'Manual credit addition');

    const newBalance = await getApiBalances();
    res.json({
      success: true,
      message: `Added ${amount} ${provider} credits`,
      newBalance: newBalance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/balances', async (req, res) => {
  try {
    const balances = await getApiBalances();
    const initialBalances = isMongoConnected && InitialBalance ? await InitialBalance.find() : [];
    const transactionCount = isMongoConnected && ApiLedger ? await ApiLedger.countDocuments() : 0;

    res.json({
      success: true,
      credits: balances,
      initialBalances: initialBalances.reduce((acc, b) => {
        acc[b.provider] = b.balance;
        return acc;
      }, {}),
      transactionCount: transactionCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// REDO COUPON SYSTEM - WITH FALLBACK
// ============================================

app.post('/api/generate-redo-coupon', async (req, res) => {
  try {
    const { paymentReference, email, serviceType } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required'
      });
    }

    const isTestMode = paymentReference.startsWith('TEST-') ||
                        paymentReference.startsWith('REDO-') ||
                        paymentReference.startsWith('MANUAL-');

    const payment = await findPaymentByReference(paymentReference);

    if (!payment && !isTestMode) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (!payment && !email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required to generate a coupon for this payment reference'
      });
    }

    const couponCode = await generateCoupon(
      paymentReference,
      email || payment?.email,
      serviceType || payment?.serviceType || 'photo-to-video'
    );

    let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (memoryStore.coupons[couponCode]) {
      expiresAt = new Date(memoryStore.coupons[couponCode].expiresAt);
    } else if (isMongoConnected && Coupon) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (coupon) {
        expiresAt = coupon.expiresAt;
      }
    }

    res.json({
      success: true,
      coupon: couponCode,
      message: 'Redo coupon generated successfully',
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('❌ Error generating redo coupon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/check-redo-coupon', async (req, res) => {
  try {
    const { couponCode, email } = req.body;

    if (!couponCode) {
      return res.json({
        success: false,
        valid: false,
        error: 'Coupon code is required'
      });
    }

    const result = await validateCoupon(couponCode, email);

    if (result.valid) {
      res.json({
        success: true,
        valid: true,
        expiresAt: result.coupon.expiresAt,
        message: 'Coupon is valid! You can regenerate your video for free.'
      });
    } else {
      res.json({
        success: false,
        valid: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error checking coupon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/redeem-redo-coupon', async (req, res) => {
  try {
    const { couponCode, email } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code is required'
      });
    }

    const result = await redeemCoupon(couponCode, email);

    if (result.success) {
      res.json({
        success: true,
        message: 'Coupon redeemed successfully! You can now regenerate your video for free.',
        paymentReference: result.coupon.paymentReference
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error redeeming coupon:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/coupon-status/:paymentReference', async (req, res) => {
  try {
    const { paymentReference } = req.params;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required'
      });
    }

    let coupon = null;
    for (const key in memoryStore.coupons) {
      if (memoryStore.coupons[key].paymentReference === paymentReference) {
        coupon = memoryStore.coupons[key];
        break;
      }
    }

    if (!coupon && isMongoConnected && Coupon) {
      coupon = await Coupon.findOne({ paymentReference });
    }

    if (coupon) {
      res.json({
        success: true,
        hasCoupon: true,
        coupon: {
          code: coupon.code,
          used: coupon.used,
          expiresAt: coupon.expiresAt,
          createdAt: coupon.createdAt
        }
      });
    } else {
      res.json({
        success: true,
        hasCoupon: false,
        message: 'No coupon found for this payment'
      });
    }

  } catch (error) {
    console.error('❌ Error getting coupon status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TRANSLATION LANGUAGES
// ============================================

const FREE_TRANSLATION_LANGUAGES = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
  'ko': 'Korean', 'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu',
  'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Tagalog', 'vi': 'Vietnamese',
  'th': 'Thai', 'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba',
  'ig': 'Igbo', 'zu': 'Zulu', 'af': 'Afrikaans', 'am': 'Amharic',
  'ne': 'Nepali', 'si': 'Sinhala', 'ta': 'Tamil', 'te': 'Telugu',
  'ml': 'Malayalam', 'kn': 'Kannada', 'pa': 'Punjabi', 'gu': 'Gujarati',
  'mr': 'Marathi', 'or': 'Odia'
};

app.get('/api/free-languages', (req, res) => {
  console.log('🌐 GET /api/free-languages - Returning languages');
  res.json({
    success: true,
    languages: FREE_TRANSLATION_LANGUAGES,
    count: Object.keys(FREE_TRANSLATION_LANGUAGES).length
  });
});

app.get('/api/translation-price', (req, res) => {
  try {
    const duration = parseInt(req.query.duration) || 5;
    const price = 300;
    const cost = 50;

    res.json({
      success: true,
      duration: duration,
      price: price,
      cost: cost,
      currency: 'KES',
      breakdown: {
        basePrice: 300,
        serviceFee: 300,
        total: 300
      },
      message: 'Fixed price of KES 300 for video translation'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/translations', async (req, res) => {
  try {
    const { email } = req.query;
    const translations = await getTranslations(email);

    res.json({
      success: true,
      translations: translations,
      total: translations.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SEND VIDEO EMAIL ENDPOINT
// ============================================

app.post('/api/send-video-email', async (req, res) => {
  try {
    const { email, videoUrl, prompt, amount, duration } = req.body;

    if (!email || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Email and video URL are required'
      });
    }

    console.log(`📧 Sending video to ${email}`);
    console.log(`📹 Video URL: ${videoUrl}`);

    const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, amount, duration || 5);

    const result = await sendEmail(email, videoEmail.subject, videoEmail.html);

    if (result.success) {
      console.log(`✅ Video email sent successfully to ${email}`);
      return res.json({
        success: true,
        message: 'Video sent to your email',
        provider: result.provider
      });
    }

    console.error(`❌ Email send failed for ${email}: ${result.error}`);
    return res.status(502).json({
      success: false,
      error: result.error || 'Failed to send email',
      provider: result.provider
    });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TEST EMAIL ENDPOINT
// ============================================

app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log(`📧 Testing email to ${email}`);

    const result = await sendEmail(
      email,
      '✅ Test Email from VidAI Creator',
      `
        <h1>Test Email Successful!</h1>
        <p>Your email configuration is working correctly.</p>
        <p>Provider: ${emailProvider.toUpperCase()}</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    );

    res.json({
      success: result.success,
      provider: result.provider,
      error: result.error || null,
      message: result.success ? 'Test email sent successfully' : `Failed to send test email: ${result.error}`
    });
  } catch (error) {
    console.error('❌ Test email error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test-google-cloud', async (req, res) => {
  try {
    const results = {
      translate: false,
      tts: false,
      groq: !!groq,
      apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
      groqConfigured: !!process.env.GROQ_API_KEY
    };

    try {
      const testText = 'Hello world';
      const result = await translateText(testText, 'fr');
      results.translate = true;
      results.translateSample = result;
    } catch (e) {
      results.translateError = e.message;
    }

    try {
      const audio = await textToSpeech('Test', 'fr');
      results.tts = true;
      results.ttsSample = `Audio buffer size: ${audio ? audio.length : 0} bytes`;
    } catch (e) {
      results.ttsError = e.message;
    }

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function sendReceiptEmail(email, amount, reference, serviceType) {
  const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceType, 5);
  await sendEmail(email, receiptEmail.subject, receiptEmail.html);
  console.log(`📧 Receipt sent to ${email}`);
}

// ============================================
// VIDEO GENERATION WITH DURATION SUPPORT
// ============================================

const failedGenerations = {};

// ============================================
// BYTEPLUS MODEL ID RESOLUTION
// ============================================
function getModelArkModelIds() {
  const raw = process.env.MODELARK_MODEL_IDS;
  if (raw && raw.trim().length > 0) {
    return raw.split(',').map(id => id.trim()).filter(Boolean);
  }
  return ['dreamina-seedance-2-0-260128', 'ep-m-20260721145303-hf4fp'];
}

async function pollDreaminaTask(taskId, token, endpoint) {
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const pollResponse = await fetch(`${endpoint}/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!pollResponse.ok) {
        const bodyText = await pollResponse.text().catch(() => '');
        console.warn(`⚠️ Dreamina poll ${attempts + 1} failed: ${pollResponse.status} ${bodyText.substring(0, 300)}`);
        attempts++;
        continue;
      }
      const result = await pollResponse.json();
      if (result.status === 'succeeded') return result;
      if (result.status === 'failed') throw new Error(result.error || 'Dreamina generation failed');
      attempts++;
    } catch (error) {
      console.warn(`⚠️ Dreamina poll ${attempts + 1} error:`, error.message);
      attempts++;
    }
  }
  throw new Error('Timeout waiting for Dreamina video generation');
}

// ============================================
// SCENE GENERATION PROVIDERS
// ============================================

// ---- Kling API ----
//
// Kling issues an "AccessKey" + "SecretKey" pair, and you are expected to
// sign a short-lived JWT yourself (header.payload.signature) using
// HMAC-SHA256 with the SecretKey.
//
// Set these two env vars:
//   KLING_ACCESS_KEY=<your access key>
//   KLING_SECRET_KEY=<your secret key>
//
// If only KLING_API_KEY is set in the legacy "ak.sk" or "ak:sk" form,
// we also try to split it automatically as a convenience.
//
// FIX: a "1002 access key not found" response with a well-formed JWT
// usually does NOT mean the key is fake — it means the key was issued
// against a different regional cluster than the one being called. Kling
// runs (at least) a Singapore cluster and a global/mainland cluster with
// separate key registries, and hitting the wrong one for a given key
// returns exactly this error. Instead of hardcoding one host, we now try
// every configured host in order and only fail once all of them 401.
// Set KLING_API_HOST to pin a single host if you know which region your
// key belongs to.
function getKlingCredentials() {
  let accessKey = process.env.KLING_ACCESS_KEY;
  let secretKey = process.env.KLING_SECRET_KEY;

  if ((!accessKey || !secretKey) && process.env.KLING_API_KEY) {
    const raw = process.env.KLING_API_KEY.trim();
    // Support "accessKey.secretKey" or "accessKey:secretKey" as a fallback
    const parts = raw.includes(':') ? raw.split(':') : raw.split('.');
    if (parts.length === 2) {
      accessKey = accessKey || parts[0];
      secretKey = secretKey || parts[1];
    }
  }

  return { accessKey, secretKey };
}

function getKlingHosts() {
  if (process.env.KLING_API_HOST) {
    return [process.env.KLING_API_HOST.replace(/\/$/, '')];
  }
  // Try both known regional clusters — order matters only for latency,
  // not correctness, since only the host matching the key's region works.
  return [
    'https://api-singapore.klingai.com',
    'https://api.klingai.com'
  ];
}

function generateKlingToken() {
  const { accessKey, secretKey } = getKlingCredentials();

  if (!accessKey || !secretKey) {
    throw new Error(
      'Kling: missing credentials. Set KLING_ACCESS_KEY and KLING_SECRET_KEY ' +
      '(or KLING_API_KEY as "accessKey:secretKey") in your environment.'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800,   // token valid for 30 minutes
    nbf: now - 5       // valid starting 5 seconds ago (clock skew buffer)
  };

  // jsonwebtoken produces a standard 3-part header.payload.signature JWT
  return jwt.sign(payload, secretKey, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' }
  });
}

async function tryKlingHost(host, apiKey, photoUrl, prompt, duration) {
  const createRes = await fetch(`${host}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model_name: 'kling-v3-0',
      image: photoUrl,
      prompt: prompt || 'Create a cinematic scene',
      duration: String(duration <= 5 ? 5 : 10),
      mode: 'std',
      cfg_scale: 0.5
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    const err = new Error(`Kling (${host}): HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
    err.status = createRes.status;
    throw err;
  }

  const { data } = await createRes.json();
  const taskId = data.task_id;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`${host}/v1/videos/image2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const poll = await pollRes.json();
    if (poll.data?.task_status === 'succeed') {
      return poll.data.task_result.videos[0].url;
    }
    if (poll.data?.task_status === 'failed') {
      throw new Error(`Kling (${host}) generation failed: ${poll.data.task_status_msg}`);
    }
  }
  throw new Error(`Kling (${host}): timeout waiting for video`);
}

async function generateKlingVideo(photoUrl, prompt, duration) {
  const apiKey = generateKlingToken(); // freshly signed JWT, always 3 parts
  const hosts = getKlingHosts();
  const errors = [];

  for (const host of hosts) {
    try {
      console.log(`🔄 Kling: trying host ${host}...`);
      const videoUrl = await tryKlingHost(host, apiKey, photoUrl, prompt, duration);
      console.log(`✅ Kling: succeeded via ${host}`);
      return videoUrl;
    } catch (error) {
      console.warn(`❌ Kling (${host}) failed:`, error.message);
      errors.push(error.message);
      // Only worth trying the next regional host on an access-key-not-found
      // style auth failure. Other errors (timeouts, generation failures)
      // won't be fixed by switching host, but we try anyway since it's cheap
      // relative to failing the whole waterfall.
      continue;
    }
  }

  throw new Error(`Kling: all hosts failed - ${errors.join(' | ')}`);
}

// ---- Hailuo API (MiniMax) ----
//
// FIX: the previous implementation called POST /v1/files/upload with
// purpose "video_generation" or "image_to_video" before generation. Neither
// value is valid — MiniMax's file-upload purpose enum is narrower than the
// video feature names suggest. Per MiniMax's current docs
// (https://platform.minimax.io/docs/api-reference/file-management-upload)
// the ONLY accepted purpose values are:
//   voice_clone, prompt_audio, t2a_async_input, video_understanding
// None of those apply to image-to-video input images, which is why every
// upload attempt returned "invalid params, invalid file purpose" no matter
// which of the two guessed values was tried.
//
// The actual video-generation API
// (https://platform.minimax.io/docs/api-reference/video-generation-fl2v ,
// and the equivalent i2v endpoint) does NOT require a separate upload step
// at all — first_frame_image accepts either a public image URL directly,
// or a Base64 Data URL (data:image/jpeg;base64,...). So the fix is to drop
// the upload call entirely and pass the source photo straight through.
async function generateHailuoVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('Hailuo: MINIMAX_API_KEY not configured');

  const host = process.env.MINIMAX_API_HOST || 'https://api.minimax.io';

  // No upload step: MiniMax's video_generation endpoint accepts a public
  // image URL directly as first_frame_image. Cloudinary URLs (what this
  // app always passes in) are public, so this "just works" without ever
  // touching /v1/files/upload.
  const createRes = await fetch(`${host}/v1/video_generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'MiniMax-Hailuo-02',
      prompt: prompt || 'Create a cinematic scene',
      first_frame_image: photoUrl,
      duration: duration <= 6 ? 6 : 10,
      resolution: '1080P'
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Hailuo: HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { task_id } = await createRes.json();
  if (!task_id) throw new Error('Hailuo: no task_id returned from video_generation');

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`${host}/v1/query/video_generation?task_id=${task_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const poll = await pollRes.json();
    if (poll.status === 'Success') {
      const fileRes = await fetch(`${host}/v1/files/retrieve?file_id=${poll.file_id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const file = await fileRes.json();
      return file.file.download_url;
    }
    if (poll.status === 'Fail') {
      throw new Error(`Hailuo generation failed: ${poll.fail_msg || 'Unknown error'}`);
    }
  }
  throw new Error('Hailuo: timeout waiting for video');
}

// ---- Kie.ai API ----
//
// FIX: the previous implementation POSTed to /v1/image-to-video, which
// doesn't exist on Kie's API and returned a 404. Kie.ai actually exposes a
// single unified job endpoint for every model in its marketplace:
//   POST https://api.kie.ai/api/v1/jobs/createTask
//   { "model": "<provider>/image-to-video", "input": { ... } }
// and a matching unified status endpoint:
//   GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<id>
// (see https://docs.kie.ai/market/kling/image-to-video and
// https://docs.kie.ai/market/common/get-task-detail). We now call that
// endpoint using Kling 2.6 as the underlying model — configurable via
// KIE_MODEL if a different marketplace model is preferred.
async function generateKieVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) throw new Error('Kie: KIE_API_KEY not configured');

  const model = process.env.KIE_MODEL || 'kling-2.6/image-to-video';

  const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: {
        prompt: prompt || 'Create a cinematic scene',
        image_urls: [photoUrl],
        duration: Math.min(duration, 10)
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kie: HTTP ${response.status} - ${errorText.substring(0, 300)}`);
  }

  const data = await response.json();
  const taskId = data.data?.taskId || data.taskId || data.data?.task_id;
  if (!taskId) {
    throw new Error(`Kie: no taskId in createTask response - ${JSON.stringify(data).substring(0, 300)}`);
  }

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const poll = await pollRes.json();
    const state = poll.data?.state || poll.data?.status;
    if (state === 'success' || state === 'completed' || state === 'succeeded') {
      const resultJson = poll.data?.resultJson ? JSON.parse(poll.data.resultJson) : poll.data;
      const url = resultJson?.resultUrls?.[0] || resultJson?.video_url || poll.data?.video_url;
      if (!url) throw new Error('Kie: task succeeded but no video URL in response');
      return url;
    }
    if (state === 'fail' || state === 'failed') {
      throw new Error(`Kie generation failed: ${poll.data?.failMsg || poll.data?.error || 'Unknown error'}`);
    }
  }
  throw new Error('Kie: Timeout waiting for video');
}

// Magic Hour AI
async function generateMagicHourVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.MAGIC_HR_API;
  if (!apiKey) throw new Error('Magic Hour: MAGIC_HR_API not configured');

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // Get upload URL
  const cleanExt = (photoUrl.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const validExtensions = ['png', 'jpg', 'jpeg', 'heic', 'heif', 'webp', 'avif', 'jp2', 'tiff', 'bmp'];
  const extension = validExtensions.includes(cleanExt) ? cleanExt : 'jpg';

  const uploadUrlRes = await fetch('https://api.magichour.ai/v1/files/upload-urls', {
    method: 'POST',
    headers,
    body: JSON.stringify({ items: [{ type: 'image', extension }] })
  });

  if (!uploadUrlRes.ok) {
    const errorText = await uploadUrlRes.text();
    throw new Error(`Magic Hour: HTTP ${uploadUrlRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { items } = await uploadUrlRes.json();
  const { upload_url: uploadUrl, file_path: filePath } = items[0];

  // Upload image
  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Magic Hour: failed to fetch source photo (HTTP ${imgRes.status})`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  const putRes = await fetch(uploadUrl, { method: 'PUT', body: imgBuffer });
  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`Magic Hour: HTTP ${putRes.status} - ${errorText.substring(0, 300)}`);
  }

  // Create image-to-video project
  const endSeconds = Math.min(Math.max(duration, 5), 60);

  // FIX: the account hitting this API is on a tier where 1080p/720p are
  // rejected with "422 Resolution 720p not available for your subscription
  // tier". Per Magic Hour's docs, 480p and 720p require at least the
  // Creator tier, and 1080p requires Pro/Business — so 480p is the safest
  // default that works across every paid tier. Override with
  // MAGIC_HOUR_RESOLUTION once you've confirmed which tier the account is on.
  const magicHourResolution = process.env.MAGIC_HOUR_RESOLUTION || '480p';

  const createRes = await fetch('https://api.magichour.ai/v1/image-to-video', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `photo-to-video-${Date.now()}`,
      end_seconds: endSeconds,
      resolution: magicHourResolution,
      assets: { image_file_path: filePath },
      style: { prompt: prompt || 'A cinematic scene' }
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Magic Hour: HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
  }

  const created = await createRes.json();
  const projectId = created.id;
  if (!projectId) throw new Error('Magic Hour: no project id returned');

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.magichour.ai/v1/video-projects/${projectId}`, { headers });
    if (!pollRes.ok) continue;
    const poll = await pollRes.json();

    if (poll.status === 'complete') {
      const url = poll.downloads?.[0]?.url;
      if (!url) throw new Error('Magic Hour: completed but no download URL');
      return url;
    }
    if (poll.status === 'error') {
      throw new Error(`Magic Hour: ${poll.error?.message || 'generation failed'}`);
    }
    if (poll.status === 'canceled') {
      throw new Error('Magic Hour: generation was canceled');
    }
  }
  throw new Error('Magic Hour: timeout waiting for video');
}

// Runway API
async function generateRunwayVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) throw new Error('Runway: RUNWAY_API_KEY not configured');

  const createRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: 'gen4_turbo',
      promptImage: photoUrl,
      promptText: prompt || 'A cinematic scene',
      ratio: '1280:720',
      duration: duration <= 5 ? 5 : 10
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Runway: HTTP ${createRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { id: taskId } = await createRes.json();

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06'
      }
    });
    const poll = await pollRes.json();
    if (poll.status === 'SUCCEEDED') return poll.output[0];
    if (poll.status === 'FAILED') throw new Error(`Runway: ${poll.failure || 'generation failed'}`);
  }
  throw new Error('Runway: timeout waiting for video');
}

// Google Veo API
async function generateVeoVideo(photoUrl, prompt, duration) {
  const apiKey = process.env.GOOGLE_VEO_API_KEY;
  if (!apiKey) throw new Error('Veo: GOOGLE_VEO_API_KEY not configured');

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Veo: failed to fetch image (HTTP ${imgRes.status})`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const imgBase64 = imgBuffer.toString('base64');

  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt: prompt || 'A cinematic scene with natural motion',
          image: { bytesBase64Encoded: imgBase64, mimeType: 'image/jpeg' }
        }],
        parameters: { durationSeconds: Math.min(duration, 8), aspectRatio: '16:9' }
      })
    }
  );

  if (!startRes.ok) {
    const errorText = await startRes.text();
    throw new Error(`Veo: HTTP ${startRes.status} - ${errorText.substring(0, 300)}`);
  }

  const { name: opName } = await startRes.json();

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const opRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`);
    const op = await opRes.json();
    if (op.done) {
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error('Veo: no video URI in completed operation');
      return `${uri}&key=${apiKey}`;
    }
  }
  throw new Error('Veo: timeout waiting for video');
}

// ============================================
// SCENE PROVIDER ORDER (with cost estimates)
// ============================================
// NOTE: BytePlus is intentionally NOT in this list. BytePlus's content
// filter (InputImageSensitiveContentDetected.PrivacyInformation) rejects
// real person photos outright, which is exactly the input this waterfall
// receives most often for photo-to-video. That's a policy rejection, not
// something a retry or code fix can work around, so BytePlus is removed
// from the photo-to-video path entirely. It's left in place for
// text-to-video (/api/generate-video) and video translation, which don't
// send a source photo and so never hit that filter.
const SCENE_PROVIDERS = [
  { name: 'kling', fn: generateKlingVideo, enabled: () => {
      const { accessKey, secretKey } = getKlingCredentials();
      return !!accessKey && !!secretKey;
    }, cost: 0.084 },
  { name: 'hailuo', fn: generateHailuoVideo, enabled: () => !!process.env.MINIMAX_API_KEY, cost: 0.10 },
  { name: 'kie', fn: generateKieVideo, enabled: () => !!process.env.KIE_API_KEY, cost: 0.06 },
  { name: 'magic_hour', fn: generateMagicHourVideo, enabled: () => !!process.env.MAGIC_HR_API, cost: 0.04 },
  { name: 'runway', fn: generateRunwayVideo, enabled: () => !!process.env.RUNWAY_API_KEY, cost: 0.50 },
  { name: 'veo', fn: generateVeoVideo, enabled: () => !!process.env.GOOGLE_VEO_API_KEY, cost: 0.30 }
];

// ============================================
// GENERATE SCENE VIDEO - MAIN FUNCTION
// ============================================
async function generateSceneVideo(photoUrl, prompt, duration) {
  const errors = [];

  // Try each provider in order
  for (const providerDef of SCENE_PROVIDERS) {
    if (!providerDef.enabled()) {
      errors.push(`${providerDef.name}: not configured`);
      continue;
    }
    try {
      console.log(`🔄 Trying ${providerDef.name} for scene generation...`);
      const videoUrl = await providerDef.fn(photoUrl, prompt, duration);
      console.log(`✅ ${providerDef.name} succeeded!`);
      return {
        videoUrl,
        provider: providerDef.name,
        cost: providerDef.cost * (duration / 5)
      };
    } catch (error) {
      console.warn(`❌ ${providerDef.name} failed:`, error.message);
      errors.push(`${providerDef.name}: ${error.message}`);
    }
  }

  throw new Error(`All scene providers failed: ${errors.join(' | ')}`);
}

// ============================================
// FALLBACK VIDEO FUNCTION
// ============================================
function createFallbackVideo(prompt, paymentReference) {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// ============================================
// TEXT TO VIDEO GENERATION
// ============================================
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference, email, retry, duration } = req.body;
    const videoDuration = duration || 5;

    console.log('🎬 Generating video...');
    console.log('📝 Prompt:', prompt ? prompt.substring(0, 100) : 'No prompt');
    console.log('⏱️ Duration:', videoDuration, 's');
    console.log('👤 User Email:', email);
    console.log('💳 Payment Reference:', paymentReference);

    if (retry && paymentReference && failedGenerations[paymentReference]) {
      console.log(`✅ Free retry allowed for payment: ${paymentReference}`);
    } else if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required.',
        requiresPayment: true
      });
    } else {
      const isValid = await verifyPayment(paymentReference);
      if (!isValid) {
        return res.status(402).json({
          success: false,
          error: 'Invalid or expired payment.',
          requiresPayment: true
        });
      }
      console.log('✅ Payment verified:', paymentReference);
    }

    const durationMultiplier = videoDuration === 5 ? 1 : videoDuration === 10 ? 2 : videoDuration === 15 ? 3 : 1;

    let videoUrl = null;
    let usedModel = null;
    let provider = null;
    let cost = 0.08 * durationMultiplier;
    const generationErrors = [];

    // Try Replicate first
    try {
      const replicateToken = (process.env.REPLICATE_API_TOKEN || '').trim();
      if (replicateToken) {
        console.log('🔄 Trying Replicate HappyHorse...');
        console.log(`🔑 Replicate token present (length: ${replicateToken.length}, prefix: ${replicateToken.substring(0, 3)}...)`);

        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: "alibaba/happy-horse:latest",
            input: {
              prompt: prompt,
              num_frames: videoDuration === 5 ? 16 : videoDuration === 10 ? 32 : 48,
              fps: 8,
              guidance_scale: 7.0,
              num_inference_steps: 30,
              width: 1024,
              height: 576
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Replicate prediction created:', data.id);

          let prediction = data;
          let attempts = 0;
          while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
              headers: { 'Authorization': `Token ${replicateToken}` }
            });
            prediction = await pollResponse.json();
            attempts++;
            console.log(`⏳ Replicate poll ${attempts}: ${prediction.status}`);
          }

          if (prediction.status === 'succeeded') {
            videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            usedModel = 'HappyHorse';
            provider = 'replicate';
            cost = 0.08 * durationMultiplier;
            console.log('✅ Replicate video generated successfully!');
          } else {
            generationErrors.push(`Replicate: prediction ended with status "${prediction.status}"`);
          }
        } else {
          const bodyText = await response.text().catch(() => '');
          if (response.status === 401) {
            console.error('❌ Replicate 401 Unauthorized — REPLICATE_API_TOKEN is invalid/expired. ' +
              'Regenerate it at https://replicate.com/account/api-tokens and update it in Render → Environment.');
          }
          console.warn(`⚠️ Replicate request failed: ${response.status} ${bodyText.substring(0, 500)}`);
          generationErrors.push(`Replicate: HTTP ${response.status} - ${bodyText.substring(0, 200)}`);
        }
      } else {
        generationErrors.push('Replicate: REPLICATE_API_TOKEN not set');
      }
    } catch (error) {
      console.warn('❌ Replicate error:', error.message);
      generationErrors.push(`Replicate: ${error.message}`);
    }

    // Try BytePlus as fallback
    if (!videoUrl) {
      try {
        const token = process.env.MODELARK_API_KEY;
        if (token) {
          const endpoint = process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3';
          const modelIds = getModelArkModelIds();
          console.log(`🧩 Resolved BytePlus model IDs to try: ${modelIds.join(', ')}`);

          for (const modelId of modelIds) {
            try {
              console.log(`🔄 Trying BytePlus model: ${modelId}`);
              const createResponse = await fetch(`${endpoint}/contents/generations/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                  model: modelId,
                  content: [{ type: "text", text: prompt }],
                  parameters: {
                    duration: videoDuration,
                    resolution: "720p",
                    ratio: "16:9",
                    fps: 24,
                    output_sound: "close",
                    watermark: false
                  }
                })
              });

              if (!createResponse.ok) {
                const bodyText = await createResponse.text().catch(() => '');
                console.warn(`⚠️ BytePlus ${modelId} failed: ${createResponse.status} — ${bodyText.substring(0, 500)}`);
                generationErrors.push(`BytePlus ${modelId}: HTTP ${createResponse.status} - ${bodyText.substring(0, 200)}`);
                continue;
              }

              const taskData = await createResponse.json();
              console.log(`✅ BytePlus task created:`, taskData.id);
              const result = await pollDreaminaTask(taskData.id, token, endpoint);
              videoUrl = result.content?.video_url || result.output?.video_url || result.video_url;

              if (videoUrl) {
                usedModel = modelId;
                provider = 'byteplus';
                cost = 0.15 * durationMultiplier;
                console.log(`✅ BytePlus video generated with ${modelId}!`);
                break;
              } else {
                generationErrors.push(`BytePlus ${modelId}: task succeeded but no video_url in response`);
              }
            } catch (error) {
              console.warn(`❌ BytePlus ${modelId} error:`, error.message);
              generationErrors.push(`BytePlus ${modelId}: ${error.message}`);
              continue;
            }
          }
        } else {
          generationErrors.push('BytePlus: MODELARK_API_KEY not set');
        }
      } catch (error) {
        console.warn('❌ BytePlus error:', error.message);
        generationErrors.push(`BytePlus: ${error.message}`);
      }
    }

    if (!videoUrl) {
      console.error('❌ All video providers failed:', generationErrors);
      if (paymentReference) {
        failedGenerations[paymentReference] = {
          timestamp: new Date().toISOString(),
          email: email,
          prompt: prompt,
          duration: videoDuration,
          reason: 'Generation failed',
          errors: generationErrors
        };
      }
      return res.json({
        success: true,
        videoUrl: createFallbackVideo(prompt, paymentReference),
        usedModel: 'Preview (Fallback)',
        isFallback: true,
        canRetry: true,
        note: 'Video generation failed. You can retry for free.',
        paymentReference,
        debugErrors: generationErrors
      });
    }

    if (provider === 'replicate') {
      await addApiTransaction('replicate', cost, 'usage', `Video generation with ${usedModel} (${videoDuration}s)`);
    } else if (provider === 'byteplus') {
      await addApiTransaction('byteplus', cost, 'usage', `Video generation with ${usedModel} (${videoDuration}s)`);
    }

    await addVideoUsage(
      paymentReference || 'test_' + Date.now(),
      email || 'anonymous',
      'text-to-video',
      prompt,
      cost,
      usedModel,
      provider,
      videoDuration
    );

    await addActivityLog(
      email || 'anonymous',
      `🎬 Generated ${videoDuration}s video with ${provider}`,
      `Model: ${usedModel}, Cost: $${cost.toFixed(2)}`,
      0
    );

    if (failedGenerations[paymentReference]) {
      delete failedGenerations[paymentReference];
    }

    let emailResult = { success: false };
    try {
      const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, amount || 0, videoDuration);
      emailResult = await sendEmail(email, videoEmail.subject, videoEmail.html);
      console.log(`📧 Video email sent to ${email}: ${emailResult.success}`);
    } catch (emailErr) {
      console.warn('⚠️ Could not send video email:', emailErr.message);
      emailResult = { success: false, error: emailErr.message };
    }

    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: usedModel,
      provider: provider,
      cost: cost,
      duration: videoDuration,
      paymentReference,
      userEmail: email,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    const fallbackUrl = createFallbackVideo(req.body.prompt, req.body.paymentReference);
    res.json({
      success: true,
      videoUrl: fallbackUrl,
      usedModel: 'Preview (Fallback)',
      isFallback: true,
      canRetry: true,
      note: 'Video generation failed. You can retry for free.'
    });
  }
});

// ============================================
// PHOTO TO VIDEO GENERATION - FIXED
// ============================================
app.post('/api/generate-photo-video', async (req, res) => {
  try {
    const { photoUrls, prompt, duration, aspectRatio, paymentReference, email } = req.body;
    const videoDuration = duration || 5;

    console.log('🖼️ Generating photo-to-video...');
    console.log('📸 Photos:', photoUrls?.length || 0);
    console.log('📝 Prompt:', prompt ? prompt.substring(0, 100) : 'No prompt');
    console.log('⏱️ Duration:', videoDuration, 's');
    console.log('👤 User Email:', email);
    console.log('💳 Payment Reference:', paymentReference);

    if (!photoUrls || photoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one photo URL is required'
      });
    }

    const isTestMode = paymentReference && (paymentReference.startsWith('TEST-') ||
      paymentReference.startsWith('REDO-') ||
      paymentReference.startsWith('MANUAL-'));

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required.',
        requiresPayment: true
      });
    }

    if (!isTestMode) {
      const isValid = await verifyPayment(paymentReference);
      if (!isValid) {
        return res.status(402).json({
          success: false,
          error: 'Invalid or expired payment.',
          requiresPayment: true
        });
      }
      console.log('✅ Payment verified:', paymentReference);
    } else {
      console.log('🧪 Test mode: Skipping payment verification for:', paymentReference);
    }

    const durationMultiplier = videoDuration === 5 ? 1 : videoDuration === 10 ? 2 : videoDuration === 15 ? 3 : 1;
    let videoUrl = null;
    let usedModel = null;
    let provider = null;
    let cost = 0.15 * durationMultiplier;
    const generationErrors = [];

    // Try scene generation providers first (Kling → Hailuo → Kie → Magic Hour → Runway → Veo)
    // NOTE: BytePlus is deliberately NOT part of the photo-to-video waterfall.
    // See the comment above SCENE_PROVIDERS for why.
    try {
      const sceneResult = await generateSceneVideo(
        photoUrls[0],
        prompt || 'A cinematic scene with natural motion',
        videoDuration
      );
      videoUrl = sceneResult.videoUrl;
      usedModel = sceneResult.provider;
      provider = sceneResult.provider;
      cost = sceneResult.cost;
      console.log(`✅ Scene video generated via ${sceneResult.provider}!`);
    } catch (error) {
      console.warn('❌ Scene-generation waterfall failed:', error.message);
      generationErrors.push(`Scene providers: ${error.message}`);
    }

    // If scene providers failed, try using Replicate as final fallback.
    // FIX: Replicate's stable-video-diffusion schema expects video_length
    // as a STRING, not a number. The API was rejecting every request with
    // "input.video_length: Invalid type. Expected: string, given: integer"
    // before it ever got to actually generating anything.
    if (!videoUrl) {
      try {
        const replicateToken = (process.env.REPLICATE_API_TOKEN || '').trim();
        if (replicateToken) {
          console.log('🔄 Trying Replicate as final fallback...');
          console.log(`🔑 Replicate token present (length: ${replicateToken.length}, prefix: ${replicateToken.substring(0, 3)}...)`);

          // Use photo as first frame for video generation
          const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${replicateToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              version: "lucataco/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
              input: {
                input_image: photoUrls[0],
                // FIX: was a number before — this model's schema requires a string.
                video_length: String(videoDuration === 5 ? 25 : videoDuration === 10 ? 50 : 75),
                s_conditioning_mode: "both",
                s_churn: 0.5,
                s_tmax: 0.1,
                s_tmin: 0.1,
                s_noise: 0.2,
                frames_per_second: 5,
                motion_bucket_id: 127,
                cond_aug: 0.02,
                decoding_t: 7,
                seed: Math.floor(Math.random() * 1000000)
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Replicate prediction created:', data.id);

            let prediction = data;
            let attempts = 0;
            while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 60) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                headers: { 'Authorization': `Token ${replicateToken}` }
              });
              prediction = await pollResponse.json();
              attempts++;
              console.log(`⏳ Replicate poll ${attempts}: ${prediction.status}`);
            }

            if (prediction.status === 'succeeded') {
              videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
              usedModel = 'Stable Video Diffusion';
              provider = 'replicate';
              cost = 0.20 * durationMultiplier;
              console.log('✅ Replicate video generated successfully!');
            } else {
              generationErrors.push(`Replicate: prediction ended with status "${prediction.status}"`);
            }
          } else {
            const bodyText = await response.text().catch(() => '');
            if (response.status === 401) {
              console.error('❌ Replicate 401 Unauthorized — REPLICATE_API_TOKEN is invalid/expired. ' +
                'Regenerate it at https://replicate.com/account/api-tokens and update it in Render → Environment.');
            }
            generationErrors.push(`Replicate: HTTP ${response.status} - ${bodyText.substring(0, 200)}`);
          }
        } else {
          generationErrors.push('Replicate: REPLICATE_API_TOKEN not set');
        }
      } catch (error) {
        console.warn('❌ Replicate final fallback error:', error.message);
        generationErrors.push(`Replicate fallback: ${error.message}`);
      }
    }

    if (!videoUrl) {
      console.error('❌ Photo-to-video generation failed for all models:', generationErrors);
      if (paymentReference) {
        failedGenerations[paymentReference] = {
          timestamp: new Date().toISOString(),
          email: email,
          prompt: prompt,
          duration: videoDuration,
          reason: 'Generation failed',
          errors: generationErrors
        };
      }
      return res.json({
        success: true,
        videoUrl: createFallbackVideo(prompt, paymentReference),
        usedModel: 'Preview (Fallback)',
        isFallback: true,
        canRetry: true,
        note: 'Photo-to-video generation failed. You can retry for free.',
        paymentReference,
        debugErrors: generationErrors
      });
    }

    // Record usage
    await addVideoUsage(
      paymentReference,
      email || 'anonymous',
      'photo-to-video',
      prompt,
      cost,
      usedModel,
      provider,
      videoDuration
    );

    await addActivityLog(
      email || 'anonymous',
      `🖼️ Generated ${videoDuration}s photo-to-video`,
      `Model: ${usedModel}, Photos: ${photoUrls.length}`,
      0
    );

    // Send email
    let emailResult = { success: false };
    try {
      console.log(`📧 Sending video email to ${email}`);
      const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, 0, videoDuration);
      emailResult = await sendEmail(email, videoEmail.subject, videoEmail.html);
      console.log(`📧 Video email sent to ${email}: ${emailResult.success}`);
    } catch (emailErr) {
      console.warn('⚠️ Could not send video email:', emailErr.message);
      emailResult = { success: false, error: emailErr.message };
    }

    res.json({
      success: true,
      videoUrl,
      usedModel,
      provider,
      cost,
      duration: videoDuration,
      paymentReference,
      userEmail: email,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });

  } catch (error) {
    console.error('❌ Photo-to-video error:', error.message);
    res.json({
      success: true,
      videoUrl: createFallbackVideo(req.body.prompt, req.body.paymentReference),
      usedModel: 'Preview (Fallback)',
      isFallback: true,
      canRetry: true,
      note: 'Photo-to-video generation failed. You can retry for free.'
    });
  }
});

// ============================================
// FREE RETRY ENDPOINTS
// ============================================

app.post('/api/check-free-retry', (req, res) => {
  const { paymentReference } = req.body;
  if (!paymentReference) return res.json({ success: false, error: 'Payment reference required' });
  res.json({ success: true, canRetry: !!failedGenerations[paymentReference], paymentReference });
});

app.post('/api/check-failed-by-email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: 'Email required' });
  let foundReference = null;
  for (const [ref, data] of Object.entries(failedGenerations)) {
    if (data.email === email) { foundReference = ref; break; }
  }
  res.json({ success: true, hasFailed: !!foundReference, paymentReference: foundReference });
});

app.get('/api/failed-generation/:paymentReference', (req, res) => {
  const { paymentReference } = req.params;
  const failed = failedGenerations[paymentReference];
  res.json({ success: true, exists: !!failed, details: failed || null });
});

app.post('/api/manual-add-failed', (req, res) => {
  const { paymentReference, email, prompt } = req.body;
  if (!paymentReference) return res.json({ success: false, error: 'Payment reference required' });
  failedGenerations[paymentReference] = {
    timestamp: new Date().toISOString(),
    email: email || 'katungu1@gmail.com',
    prompt: prompt || 'DukaApp promotional video',
    duration: 5,
    reason: 'Manually added for testing'
  };
  res.json({ success: true, message: 'Failed generation added manually', paymentReference });
});

app.get('/api/debug-failed', (req, res) => {
  res.json({ failedGenerations, total: Object.keys(failedGenerations).length, keys: Object.keys(failedGenerations) });
});

// ============================================
// DEBUG ENDPOINTS
// ============================================

app.get('/api/debug-modelark-ids', (req, res) => {
  res.json({
    resolvedModelIds: getModelArkModelIds(),
    source: process.env.MODELARK_MODEL_IDS ? 'MODELARK_MODEL_IDS env var' : 'built-in default (fixed)',
    endpoint: process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3',
    tokenConfigured: !!process.env.MODELARK_API_KEY
  });
});

app.get('/api/debug-scene-providers', (req, res) => {
  const providers = SCENE_PROVIDERS.map(p => ({
    name: p.name,
    configured: p.enabled(),
    keyStatus: p.enabled() ? '✅' : '❌'
  }));

  const { accessKey, secretKey } = getKlingCredentials();

  res.json({
    providers,
    totalConfigured: providers.filter(p => p.configured).length,
    totalProviders: providers.length,
    klingAccessKeyConfigured: !!accessKey,
    klingSecretKeyConfigured: !!secretKey,
    klingHosts: getKlingHosts(),
    kieModel: process.env.KIE_MODEL || 'kling-2.6/image-to-video',
    magicHourResolution: process.env.MAGIC_HOUR_RESOLUTION || '480p (default)',
    bytePlusInPhotoToVideo: false
  });
});

// ============================================
// PRICE CALCULATION ENDPOINT
// ============================================

app.post('/api/calculate-price', (req, res) => {
  try {
    console.log('💰 Price calculation request received');
    console.log('📦 Request body:', req.body);

    const { serviceType, options } = req.body;
    const duration = options?.duration || 5;
    const photoCount = options?.photoCount || 1;

    console.log(`📊 Service: ${serviceType}, Duration: ${duration}s, Photos: ${photoCount}`);

    let finalPrice = 0;
    let breakdown = [];
    let serviceName = '';

    if (serviceType === 'photos_to_video' || serviceType === 'photo-to-video' || serviceType === 'photo_to_video') {
      let pricePerPhoto = 0;

      if (photoCount === 1) {
        if (duration === 5) pricePerPhoto = 300;
        else if (duration === 10) pricePerPhoto = 600;
        else if (duration === 15) pricePerPhoto = 900;
      } else if (photoCount === 2) {
        if (duration === 5) pricePerPhoto = 600;
        else if (duration === 10) pricePerPhoto = 1200;
        else if (duration === 15) pricePerPhoto = 1800;
      } else if (photoCount >= 3) {
        if (duration === 5) pricePerPhoto = 500;
        else if (duration === 10) pricePerPhoto = 1000;
        else if (duration === 15) pricePerPhoto = 2000;
      }

      finalPrice = pricePerPhoto;

      breakdown = [
        { item: `AI Photo-to-Video (${photoCount} photo${photoCount > 1 ? 's' : ''})`, amount: finalPrice },
        { item: `${duration}s video generation`, amount: 0 }
      ];

      serviceName = `AI Photo-to-Video (${duration}s, ${photoCount} photo${photoCount > 1 ? 's' : ''})`;
    } else if (serviceType === 'image_to_video') {
      if (duration === 5) finalPrice = 300;
      else if (duration === 10) finalPrice = 600;
      else if (duration === 15) finalPrice = 1200;

      breakdown = [
        { item: 'AI Image-to-Video', amount: finalPrice },
        { item: `${duration}s video generation`, amount: 0 }
      ];

      serviceName = `AI Image-to-Video (${duration}s)`;
    } else {
      if (duration === 5) finalPrice = 300;
      else if (duration === 10) finalPrice = 600;
      else if (duration === 15) finalPrice = 1200;

      breakdown = [
        { item: 'AI Text-to-Video', amount: finalPrice },
        { item: `${duration}s video generation`, amount: 0 }
      ];

      serviceName = `AI Text-to-Video (${duration}s)`;
    }

    console.log(`✅ Price calculated: KES ${finalPrice}`);

    const priceData = {
      serviceType: serviceType || 'photo_to_video',
      serviceName: serviceName,
      finalPrice: finalPrice,
      breakdown: breakdown,
      currency: 'KES',
      duration: duration,
      photoCount: photoCount
    };

    res.json({
      success: true,
      price: priceData,
      formatted: `KES ${finalPrice}`
    });

  } catch (error) {
    console.error('❌ Price calculation error:', error.message);
    console.error('Stack:', error.stack);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TEST & HEALTH ENDPOINTS
// ============================================

app.get('/api/test', (req, res) => {
  res.json({
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    endpoints: [
      '/api/test', '/api/health',
      '/api/generate-video',
      '/api/calculate-price',
      '/api/verify-payment',
      '/api/initialize-payment',
      '/api/send-video-email',
      '/api/test-email',
      '/api/free-languages',
      '/api/translation-price',
      '/api/translate-video',
      '/api/translate-text',
      '/api/translations',
      '/api/upload-video',
      '/api/admin/dashboard',
      '/api/admin/add-credits',
      '/api/admin/balances',
      '/api/admin/payments',
      '/api/admin/add-missing-payment',
      '/api/test-google-cloud',
      '/api/translate-video-free',
      '/api/test-tts',
      '/api/debug-failed',
      '/api/debug-modelark-ids',
      '/api/debug-scene-providers'
    ]
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const replicateBalance = await getApiBalance('replicate');
    const byteplusBalance = await getApiBalance('byteplus');
    const totalRevenueResult = isMongoConnected && Revenue
      ? await Revenue.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
      : [];
    const totalVideos = isMongoConnected && VideoUsage ? await VideoUsage.countDocuments() : memoryStore.videoUsages.length;
    const totalTranslations = isMongoConnected && Translation ? await Translation.countDocuments() : memoryStore.translations.length;

    const { accessKey: klingAccessKey, secretKey: klingSecretKey } = getKlingCredentials();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      uptime: process.uptime(),
      byteplus_token: process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set',
      byteplus_model_ids: getModelArkModelIds(),
      byteplus_photo_to_video: '❌ disabled (policy rejections) — active on text-to-video & translation only',
      kling_access_key: klingAccessKey ? '✅ Set' : '❌ Not set',
      kling_secret_key: klingSecretKey ? '✅ Set' : '❌ Not set',
      kling_hosts: getKlingHosts(),
      hailuo_token: process.env.MINIMAX_API_KEY ? '✅ Set' : '❌ Not set',
      hailuo_upload_step: 'removed — first_frame_image sent directly as URL',
      kie_token: process.env.KIE_API_KEY ? '✅ Set' : '❌ Not set',
      kie_endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
      kie_model: process.env.KIE_MODEL || 'kling-2.6/image-to-video',
      magic_hour_token: process.env.MAGIC_HR_API ? '✅ Set' : '❌ Not set',
      magic_hour_resolution: process.env.MAGIC_HOUR_RESOLUTION || '480p (default)',
      runway_token: process.env.RUNWAY_API_KEY ? '✅ Set' : '❌ Not set',
      veo_token: process.env.GOOGLE_VEO_API_KEY ? '✅ Set' : '❌ Not set',
      replicate_token: (process.env.REPLICATE_API_TOKEN || '').trim() ? '✅ Set' : '❌ Not set',
      paystack_secret: process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set',
      email_configured: emailProvider !== 'none' ? `✅ ${emailProvider.toUpperCase()}` : '❌ Not set',
      mongodb_connected: isMongoConnected,
      mongodb_database: DATABASE_NAME || 'unknown',
      replicate_balance: replicateBalance,
      byteplus_balance: byteplusBalance,
      total_revenue: totalRevenueResult[0]?.total || 0,
      total_videos: totalVideos,
      total_translations: totalTranslations
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      mongodb_connected: isMongoConnected
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'Video Creator API',
    version: '2.0.3',
    status: 'running',
    features: [
      'Text-to-Video Generation (Replicate + BytePlus)',
      'Photo-to-Video Scene Generation (Kling → Hailuo → Kie → Magic Hour → Runway → Veo → Replicate)',
      'Video Translation with Payment',
      'Email Delivery',
      'Payment Integration (Paystack)',
      'Admin Dashboard',
      'Multi-language Support',
      'MongoDB Atlas Database'
    ],
    endpoints: [
      { path: '/api/test', method: 'GET' },
      { path: '/api/health', method: 'GET' },
      { path: '/api/generate-video', method: 'POST' },
      { path: '/api/calculate-price', method: 'POST' },
      { path: '/api/verify-payment', method: 'POST' },
      { path: '/api/initialize-payment', method: 'POST' },
      { path: '/api/send-video-email', method: 'POST' },
      { path: '/api/test-email', method: 'POST' },
      { path: '/api/free-languages', method: 'GET' },
      { path: '/api/translation-price', method: 'GET' },
      { path: '/api/translate-video', method: 'POST' },
      { path: '/api/translations', method: 'GET' },
      { path: '/api/upload-video', method: 'POST' },
      { path: '/api/admin/dashboard', method: 'GET' },
      { path: '/api/admin/add-credits', method: 'POST' },
      { path: '/api/admin/balances', method: 'GET' },
      { path: '/api/admin/payments', method: 'GET' },
      { path: '/api/admin/add-missing-payment', method: 'POST' },
      { path: '/api/test-google-cloud', method: 'GET' },
      { path: '/api/translate-video-free', method: 'POST' },
      { path: '/api/test-tts', method: 'POST' },
      { path: '/api/debug-modelark-ids', method: 'GET' },
      { path: '/api/debug-scene-providers', method: 'GET' }
    ],
    mongodb: {
      connected: isMongoConnected,
      database: DATABASE_NAME || 'not connected'
    },
    docs: 'https://github.com/katunguTECH/video-creator-api'
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================
const buildPath = path.join(__dirname, 'build');
if (isProduction && fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`📧 Email Provider: ${emailProvider.toUpperCase()}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`📁 Temp directory: ${tempDir}`);
  console.log(`☁️ Cloudinary storage configured`);
  console.log(`🌐 Google Cloud translation configured (REST API)`);
  console.log(`🔊 Google Cloud TTS configured (API key)`);
  console.log(`🎤 Groq transcription configured`);
  console.log(`🎬 FFmpeg configured for video processing`);
  console.log(`🎬 Text-to-video: Replicate HappyHorse primary, BytePlus fallback`);
  console.log(`🖼️ Photo-to-video: Scene waterfall (Kling → Hailuo → Kie → Magic Hour → Runway → Veo → Replicate). BytePlus intentionally excluded (policy rejections).`);
  console.log(`📊 MongoDB Atlas: ${isMongoConnected ? '✅ Connected' : '❌ Disconnected (using in-memory fallback)'}`);
  console.log(`📊 Database: ${DATABASE_NAME}`);
  console.log(`💰 Price calculation endpoint: /api/calculate-price UPDATED ✅`);
  console.log(`⏱️ Video durations supported: 5s, 10s, 15s`);
  console.log(`🌍 Translation languages: ${Object.keys(FREE_TRANSLATION_LANGUAGES).length}`);
  console.log(`💰 Translation Price: KES 300 (Fixed)`);
  console.log(`🔒 CORS configured to allow: ${allowedOrigins.join(', ')}`);
  console.log(`🔑 Using crypto.randomUUID() instead of uuid package ✅`);
  console.log(`🖼️ Photo-to-video endpoint: /api/generate-photo-video ✅`);
  console.log(`🎫 Redo coupon system enabled ✅ (with in-memory fallback)`);
  console.log(`🧪 Test mode enabled: Use TEST-* or REDO-* payment references to bypass payment`);
  console.log(`✅ Pre-created coupons: ${TEST_COUPON} (for katungu1@gmail.com), ${GENERIC_COUPON} (for testing)`);
  console.log(`📧 Video email delivery enabled ✅`);
  console.log(`📥 Download link (fl_attachment) forces real downloads across all users ✅`);
  console.log(`🐛 Verbose provider/email error logging enabled ✅ (check logs for real API errors)`);
  console.log(`🧩 BytePlus model IDs resolved to: ${getModelArkModelIds().join(', ')}`);
  console.log(`🧩 Scene providers configured: ${SCENE_PROVIDERS.filter(p => p.enabled()).map(p => p.name).join(', ') || 'NONE'}`);
  console.log(`🌏 Kling hosts to try: ${getKlingHosts().join(', ')}`);
  console.log(`💰 Replicate credit balance: $${process.env.REPLICATE_BALANCE || '10.00'}`);
});