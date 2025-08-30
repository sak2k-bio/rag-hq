#!/usr/bin/env node

/**
 * Check bulk PDF processing status and identify missed files
 */

import Database from 'better-sqlite3';

async function checkStatus() {
  try {
    const db = new Database('bulk_manifest.db');
    
    console.log('📊 Bulk PDF Processing Status\n');
    
    // Get overall statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END) as pending,
        SUM(chunks_count) as total_chunks
      FROM bulk_files
    `).get();
    
    console.log('📈 Overall Statistics:');
    console.log(`  Total files: ${stats.total || 0}`);
    console.log(`  Completed: ${stats.completed || 0}`);
    console.log(`  Errors: ${stats.errors || 0}`);
    console.log(`  Pending: ${stats.pending || 0}`);
    console.log(`  Total chunks: ${stats.total_chunks || 0}`);
    
    // Get files by status
    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM bulk_files 
      GROUP BY status
    `).all();
    
    console.log('\n📋 Status Breakdown:');
    statusBreakdown.forEach(s => {
      console.log(`  ${s.status}: ${s.count} files`);
    });
    
    // Show some error examples
    if (stats.errors > 0) {
      console.log('\n❌ Recent Errors (showing first 5):');
      const errors = db.prepare(`
        SELECT path, error, updated_at 
        FROM bulk_files 
        WHERE status = 'error' 
        ORDER BY updated_at DESC 
        LIMIT 5
      `).all();
      
      errors.forEach((err, idx) => {
        const filename = err.path.split(/[\\/]/).pop();
        console.log(`  ${idx + 1}. ${filename}`);
        console.log(`     Error: ${err.error}`);
        console.log(`     Time: ${err.updated_at}`);
      });
    }
    
    // Show pending files
    if (stats.pending > 0) {
      console.log('\n⏳ Pending Files (showing first 5):');
      const pending = db.prepare(`
        SELECT path, status, updated_at 
        FROM bulk_files 
        WHERE status IN ('queued', 'processing')
        ORDER BY updated_at DESC 
        LIMIT 5
      `).all();
      
      pending.forEach((file, idx) => {
        const filename = file.path.split(/[\\/]/).pop();
        console.log(`  ${idx + 1}. ${filename} (${file.status})`);
        console.log(`     Time: ${file.updated_at}`);
      });
    }
    
    db.close();
    
    console.log('\n💡 To resume processing:');
    console.log('  node bulk-pdf-ingest.js "your-pdf-directory"');
    console.log('\n💡 To clear errors and restart:');
    console.log('  node clear-errors.js');
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

checkStatus();
