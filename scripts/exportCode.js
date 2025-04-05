const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const BASE_EXPORT_FILE_NAME = 'route_ts_code_export';
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', ".ai-assistant", "module_exports", "public", "scripts", "ui"]);
const IGNORE_FILES = new Set(['package-lock.json', 'yarn.lock', '.DS_Store']);
const TARGET_EXTENSIONS = ['.ts', '.tsx'];
const MAX_FILE_SIZE = 50000;

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateExport() {
  try {
    console.log('🔍 TS/TSX File Exporter');
    
    // Ask user for input
    const targetPath = await askQuestion('Enter the path to scan (leave empty for current directory): ');
    const scanPath = targetPath.trim() || process.cwd();
    
    const specificFiles = await askQuestion('Enter specific files to include (comma separated, leave empty for all): ');
    const specificDirs = await askQuestion('Enter specific directories to include (comma separated, leave empty for all): ');
    
    const fileList = specificFiles.trim() ? specificFiles.split(',').map(f => f.trim()) : null;
    const dirList = specificDirs.trim() ? specificDirs.split(',').map(d => d.trim()) : null;

    console.log('\nSearching for files...');

    const exportContent = [];
    let fileCount = 1;

    await scanDirectory(scanPath, exportContent, fileList, dirList);

    writeContentToFiles(exportContent, fileCount);

    console.log(`\n✅ Export completed. All selected code has been exported.`);

  } catch (error) {
    console.error('❌ Failed to generate export:', error);
  } finally {
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function scanDirectory(currentPath, exportContent, fileList, dirList) {
  try {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);

      // Skip ignored directories
      if (stats.isDirectory() && IGNORE_DIRS.has(item)) {
        continue;
      }

      if (stats.isDirectory()) {
        // Check if we should scan this directory
        if (dirList && !dirList.some(dir => itemPath.includes(dir))) {
          continue;
        }
        // Recursively scan subdirectories
        await scanDirectory(itemPath, exportContent, fileList, dirList);
      } else {
        // Check if we should include this file
        if (isTargetExtension(item)) {
          const shouldIncludeFile = !fileList || fileList.some(f => itemPath.includes(f));
          
          if (shouldIncludeFile) {
            console.log(`📝 Exporting content from: ${itemPath}`);
            const fileContent = fs.readFileSync(itemPath, 'utf-8');
            exportContent.push(`// File: ${itemPath}\n`);
            exportContent.push(fileContent);
          }
        }

        // Skip ignored files
        if (IGNORE_FILES.has(item)) {
          continue;
        }
      }
    }

  } catch (error) {
    console.error(`Error scanning directory ${currentPath}:`, error.message);
  }
}

function isTargetExtension(filename) {
  return TARGET_EXTENSIONS.some(ext => filename.endsWith(ext));
}

function writeContentToFiles(content, fileCount) {
  let currentFileContent = '';
  for (const line of content) {
    currentFileContent += line + '\n';

    if (currentFileContent.length >= MAX_FILE_SIZE) {
      const fileName = `${BASE_EXPORT_FILE_NAME}_${fileCount}.txt`;
      fs.writeFileSync(fileName, currentFileContent);
      console.log(`📦 Writing to file: ${fileName}`);
      fileCount++;
      currentFileContent = '';
    }
  }

  if (currentFileContent.length > 0) {
    const fileName = `${BASE_EXPORT_FILE_NAME}_${fileCount}.txt`;
    fs.writeFileSync(fileName, currentFileContent);
    console.log(`📦 Writing to file: ${fileName}`);
  }
}

// Run the export generation
generateExport();