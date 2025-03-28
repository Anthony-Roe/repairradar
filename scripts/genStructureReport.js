// generate-structure-report.js
const fs = require('fs');
const path = require('path');

// Configuration
const REPORT_FILE = 'project_structure_report.txt';
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build']);
const IGNORE_FILES = new Set(['package-lock.json', 'yarn.lock', '.DS_Store']);

function generateReport() {
  try {
    console.log('🔍 Analyzing project structure...');
    
    const report = [];
    const rootPath = process.cwd();
    
    // Add metadata
    report.push(`Project Structure Report - ${new Date().toISOString()}`);
    report.push(`Root: ${rootPath}\n`);
    
    // Generate directory tree
    scanDirectory(rootPath, report, 0);
    
    // Write report
    fs.writeFileSync(REPORT_FILE, report.join('\n'));
    
    console.log(`✅ Report generated: ${REPORT_FILE}`);
    console.log('📋 Please send this file to me so I can create a customized export script for your project.');
    
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
  }
}

function scanDirectory(currentPath, report, depth) {
  const indent = '  '.repeat(depth);
  const dirName = path.basename(currentPath);
  
  // Skip ignored directories
  if (IGNORE_DIRS.has(dirName)) {
    report.push(`${indent}└── [${dirName}] (ignored)`);
    return;
  }
  
  report.push(`${indent}├── ${dirName}/`);
  
  try {
    const items = fs.readdirSync(currentPath);
    let fileCount = 0;
    
    items.forEach((item, index) => {
      const itemPath = path.join(currentPath, item);
      const isLast = index === items.length - 1;
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath, report, depth + 1);
        } else {
          // Skip ignored files
          if (IGNORE_FILES.has(item)) {
            report.push(`${indent}${isLast ? '└' : '├'}── ${item} (ignored)`);
            return;
          }
          
          fileCount++;
          const prefix = depth === 0 ? '│   ' : '    ';
          const fileInfo = `${indent}${isLast ? '└' : '├'}── ${item} (${formatFileSize(stats.size)})`;
          report.push(fileInfo);
        }
      } catch (err) {
        report.push(`${indent}${isLast ? '└' : '├'}── ${item} (error: ${err.message})`);
      }
    });
    
    if (fileCount === 0 && items.length > 0) {
      report[report.length - 1] = report[report.length - 1].replace('├──', '└──');
    }
    
  } catch (error) {
    report.push(`${indent}└── (error reading directory: ${error.message})`);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Run the report generation
generateReport();