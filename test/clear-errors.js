#!/usr/bin/env node

/**
 * Clear error statuses and reset files for reprocessing
 */

import Database from 'better-sqlite3';

async function clearErrors() {
  try {
    const db = new Database('bulk_manifest.db');
    
    console.log('🧹 Clearing error statuses...\n');
    
    // Get current error count
    const errorCount = db.prepare('SELECT COUNT(*) as count FROM bulk_files WHERE status = "error"').get();
    console.log(`Found ${errorCount.count} files with error status`);
    
    if (errorCount.count === 0) {
      console.log('✅ No errors to clear!');
      db.close();
      return;
    }
    
    // Reset error statuses to 'queued' for reprocessing
    const result = db.prepare('UPDATE bulk_files SET status = "queued", error = NULL WHERE status = "error"').run();
    
    console.log(`✅ Reset ${result.changes} files from 'error' to 'queued' status`);
    console.log('📝 These files will be reprocessed on the next run');
    
    // Show what was reset
    const resetFiles = db.prepare(`
      SELECT path, updated_at 
      FROM bulk_files 
      WHERE status = 'queued' 
      ORDER BY updated_at DESC 
      LIMIT 10
    `).all();
    
    if (resetFiles.length > 0) {
      console.log('\n📋 Files ready for reprocessing (showing first 10):');
      resetFiles.forEach((file, idx) => {
        const filename = file.path.split(/[\\/]/).pop();
        console.log(`  ${idx + 1}. ${filename}`);
      });
    }
    
    db.close();
    
    console.log('\n🚀 You can now resume processing with:');
    console.log('  node bulk-pdf-ingest.js "your-pdf-directory"');
    
  } catch (error) {
    console.error('❌ Error clearing errors:', error.message);
  }
}

clearErrors();
