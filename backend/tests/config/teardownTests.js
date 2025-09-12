const mongoose = require('mongoose');
const { cleanupTestDirectories } = require('./testConfig');

/**
 * Global Test Teardown
 * This file is executed once after all tests are completed
 */
module.exports = async () => {
  try {
    console.log('🧹 Starting global test teardown...');
    
    // Close all mongoose connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🗄️  Mongoose connections closed');
    }
    
    // Clear all mongoose models
    mongoose.deleteModel(/.+/);
    console.log('🗂️  Mongoose models cleared');
    
    // Clean up test directories
    cleanupTestDirectories();
    console.log('📁 Test directories cleaned up');
    
    // Clear all timers
    jest.clearAllTimers();
    console.log('⏰ All timers cleared');
    
    // Clear all mocks
    jest.clearAllMocks();
    console.log('🎭 All mocks cleared');
    
    // Restore all mocks
    jest.restoreAllMocks();
    console.log('🔄 All mocks restored');
    
    // Clear module cache
    jest.resetModules();
    console.log('📦 Module cache cleared');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️  Garbage collection triggered');
    }
    
    console.log('✅ Global test teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Error during global test teardown:', error);
    // Don't throw error to avoid affecting test results
  }
};