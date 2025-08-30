#!/usr/bin/env node

/**
 * Test script to verify source cleaning logic
 */

function cleanSourceName(sourcePath) {
  if (!sourcePath) return 'Unknown';
  
  // If the path contains "split 11\", extract just the filename part after it
  if (sourcePath.includes('split 11\\')) {
    return sourcePath.split('split 11\\')[1];
  }
  
  // Otherwise, return just the filename (basename)
  return sourcePath.split(/[\\/]/).pop() || sourcePath;
}

function testSourceCleaning() {
  console.log('🧪 Testing source cleaning logic...\n');
  
  // Test cases
  const testCases = [
    'C:\\Users\\User\\Desktop\\github projects\\pulmo-superbot\\assets\\split 11\\Page_0278_CHAPTER_17_AcidBase_Balance_HCO3_level_as_determined_from_the_acidbase_nomogram_or_the_for.pdf',
    'C:\\Users\\User\\Desktop\\github projects\\pulmo-superbot\\assets\\split 12\\Page_0001_CHAPTER_1_Introduction.pdf',
    'C:\\Users\\User\\Desktop\\github projects\\pulmo-superbot\\assets\\other_folder\\document.pdf',
    '/home/user/documents/split 11/file.pdf',
    'D:\\data\\medical\\split 11\\patient_report.pdf',
    'simple_file.pdf',
    'folder/subfolder/document.txt',
    null,
    undefined,
    ''
  ];
  
  testCases.forEach((testPath, index) => {
    const cleaned = cleanSourceName(testPath);
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Input: ${testPath || 'null/undefined'}`);
    console.log(`  Cleaned: ${cleaned}`);
    console.log(`  Contains 'split 11\\': ${testPath ? testPath.includes('split 11\\') : false}`);
    console.log('');
  });
  
  console.log('✅ Source cleaning test completed!');
}

// Run the test
testSourceCleaning();
