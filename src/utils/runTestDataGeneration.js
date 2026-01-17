import { generateTestData, cleanupTestData } from '../services/testDataGenerator';

/**
 * Utility script to run test data generation
 * Can be called from browser console or imported in development
 */

/**
 * Run the complete test data generation
 */
export const runTestDataGeneration = async () => {
  try {
    console.log('🚀 Starting comprehensive test data generation...');
    console.log('📋 This will create test data for user: yXpsx5kaOhPO8em7o77F7wR9Xen1');
    
    const result = await generateTestData();
    
    console.log('✅ Test data generation completed successfully!');
    console.log('📊 Generated data summary:');
    console.log('- User profile:', result.userData.email);
    console.log('- Professional profile:', result.professionalProfile.profileType);
    console.log('- Facility profile:', result.facilityProfile.facilityName);
    console.log('- Team members:', result.teamMembers.length);
    console.log('- Contracts:', result.contracts.length);
    console.log('- Availabilities:', result.availabilities.length);
    console.log('- Positions:', result.positions.length);
    console.log('- Time-off requests:', result.timeOffRequests.length);
    console.log('- Team schedules:', result.teamSchedules.schedule ? 1 : 0);
    console.log('- Conversations (total):', result.conversationStats.total);
    console.log('  - General conversations:', result.conversationStats.general);
    console.log('  - Contract-linked conversations:', result.conversationStats.contractLinked);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to generate test data:', error);
    throw error;
  }
};

/**
 * Run cleanup of test data
 */
export const runTestDataCleanup = async () => {
  try {
    console.log('🧹 Starting test data cleanup...');
    await cleanupTestData();
    console.log('✅ Test data cleanup completed!');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
    throw error;
  }
};

/**
 * Make functions available globally for browser console usage
 */
if (typeof window !== 'undefined') {
  window.runTestDataGeneration = runTestDataGeneration;
  window.runTestDataCleanup = runTestDataCleanup;
  
  console.log('🔧 Test data utilities loaded!');
  console.log('📝 Available functions:');
  console.log('- runTestDataGeneration() - Generate comprehensive test data');
  console.log('- runTestDataCleanup() - Clean up test data');
}

export default {
  runTestDataGeneration,
  runTestDataCleanup
}; 