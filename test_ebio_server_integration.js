#!/usr/bin/env node

/**
 * Test script for eBioServer integration
 * This script tests the eBioServer webhook handler and employee matching logic
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_WEBHOOK_URL = `${BASE_URL}/api/biometric/eBioServer/webhook`;

// Sample test data
const sampleWebhookPayload = {
  device_serial_no: 'TEST123',
  device_name: 'Test Device',
  emp_code: '1001',
  emp_name: 'John Doe',
  datetime: '2023-05-15 09:30:00',
  inout_mode: 'IN',
  verify_mode: 'Finger',
  finger_id: '1',
  thumb_data: 'base64_encoded_sample_thumb_data',
  ip_address: '192.168.1.100'
};

async function testWebhook() {
  console.log('Testing eBioServer webhook integration...');
  
  try {
    // Send test webhook
    const response = await axios.post(TEST_WEBHOOK_URL, sampleWebhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log('Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testThumbDataHandling() {
  console.log('\nTesting thumb data handling...');
  
  const thumbPayload = {
    ...sampleWebhookPayload,
    verify_mode: 'Thumb',
    finger_id: null,
    thumb_data: 'base64_encoded_thumb_data_for_testing'
  };
  
  try {
    const response = await axios.post(TEST_WEBHOOK_URL, thumbPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Thumb data handling test successful!');
    console.log('Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Thumb data handling test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Starting eBioServer integration tests...\n');
  
  try {
    // Test basic webhook
    await testWebhook();
    
    // Test thumb data handling
    await testThumbDataHandling();
    
    console.log('\n🎉 All tests passed! eBioServer integration is working correctly.');
  } catch (error) {
    console.error('\n💥 Some tests failed. Please check the integration.');
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testWebhook,
  testThumbDataHandling,
  sampleWebhookPayload
};