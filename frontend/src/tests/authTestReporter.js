// Test result reporting utility
const testResults = {
  passed: [],
  failed: []
};

// Reset test results
const resetTestResults = () => {
  testResults.passed = [];
  testResults.failed = [];
};

// Record a test result
const recordTestResult = (testName, passed, details = {}) => {
  const result = {
    testName,
    timestamp: new Date().toISOString(),
    details
  };
  
  if (passed) {
    testResults.passed.push(result);
  } else {
    testResults.failed.push(result);
  }
  
  return passed;
};

// Print test results summary
const printTestResults = () => {
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = Math.round((testResults.passed.length / totalTests) * 100) || 0;
  
  console.log(`
  ===== Auth Test Results =====
  
  Total Tests: ${totalTests}
  Passed: ${testResults.passed.length} (${passRate}%)
  Failed: ${testResults.failed.length} (${100 - passRate}%)
  
  ${testResults.failed.length > 0 ? '❌ FAILED TESTS:' : '✅ ALL TESTS PASSED!'}
  `);
  
  // Print failed tests in detail
  testResults.failed.forEach((failure, index) => {
    console.log(`
    ${index + 1}. ${failure.testName}
    Time: ${new Date(failure.timestamp).toLocaleString()}
    Details: ${JSON.stringify(failure.details, null, 2)}
    `);
  });
  
  return {
    summary: {
      total: totalTests,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      passRate
    },
    passed: testResults.passed,
    failed: testResults.failed
  };
};

// Export the test reporter utilities
export {
  resetTestResults,
  recordTestResult,
  printTestResults
}; 