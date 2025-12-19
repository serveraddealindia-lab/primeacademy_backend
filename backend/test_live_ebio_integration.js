#!/usr/bin/env node

/**
 * Test script for eBioServer integration on live server
 * This script can be used to verify the integration is working correctly on the live server
 */

const axios = require('axios');

// Configuration - Update these values for your live server
const LIVE_SERVER_URL = process.env.LIVE_SERVER_URL || 'http://your-live-server.com';
const TEST_WEBHOOK_URL = `${LIVE_SERVER_URL}/api/biometric/eBioServer/webhook`;

// Sample test data
const sampleWebhookPayload = {
  device_serial_no: 'LIVE_TEST123',
  device_name: 'Live Test Device',
  emp_code: '1001',
  emp_name: 'John Doe',
  datetime: '2023-05-15 09:30:00',
  inout_mode: 'IN',
  verify_mode: 'Finger',
  finger_id: '1',
  thumb_data: 'base64_encoded_sample_thumb_data_for_live_test',
  ip_address: '192.168.1.100'
};

const thumbPayload = {
  device_serial_no: 'LIVE_TEST123',
  device_name: 'Live Test Device',
  emp_code: '1001',
  emp_name: 'John Doe',
  datetime: '2023-05-15 09:35:00',
  inout_mode: 'IN',
  verify_mode: 'Thumb',
  finger_id: null,
  thumb_data: 'base64_encoded_thumb_data_for_live_testing',
  ip_address: '192.168.1.100'
};

async function testWebhook() {
  console.log('Testing eBioServer webhook integration on live server...');
  
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
  console.log('\nTesting thumb data handling on live server...');
  
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

async function runLiveTests() {
  console.log('🚀 Starting eBioServer integration tests on live server...\n');
  
  try {
    // Test basic webhook
    await testWebhook();
    
    // Test thumb data handling
    await testThumbDataHandling();
    
    console.log('\n🎉 All tests passed! eBioServer integration is working correctly on the live server.');
  } catch (error) {
    console.error('\n💥 Some tests failed. Please check the integration.');
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  console.log(`Testing against server: ${LIVE_SERVER_URL}`);
  runLiveTests();
}

module.exports = {
  testWebhook,
  testThumbDataHandling,
  sampleWebhookPayload,
  thumbPayload
};