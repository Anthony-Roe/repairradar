const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild'); // Import esbuild for transpiling and minification

// Configuration
const BASE_EXPORT_FILE_NAME = 'route_ts_code_export'; // Base name for the output files
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', ".ai-assistant", "module_exports", "public", "scripts", "ui"]);
const IGNORE_FILES = new Set(['package-lock.json', 'yarn.lock', '.DS_Store']);
const TARGET_FILE_NAME = ''; // Only export route.ts files
const TARGET_EXTENSIONS = ['.ts', '.tsx']; // Supported extensions array
const MAX_FILE_SIZE = 50000; // Maximum size for each output file in characters

function generateExport() {
  try {
    console.log('🔍 Searching for .ts, .tsx, and .js files...');

    const exportContent = [];
    const rootPath = process.cwd();
    let fileCount = 1; // To keep track of the number of output files

    // Start scanning the directories
    scanDirectory(rootPath, exportContent);

    // Split the collected content and write to multiple files
    writeContentToFiles(exportContent, fileCount);

    console.log(`✅ Export generated. All code from selected files has been exported.`);

  } catch (error) {
    console.error('❌ Failed to generate export:', error);
  }
}

function scanDirectory(currentPath, exportContent) {
  try {
    const items = fs.readdirSync(currentPath);

    items.forEach((item) => {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);

      // Skip ignored directories
      if (stats.isDirectory() && IGNORE_DIRS.has(item)) {
        return;
      }

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(itemPath, exportContent);
      } else {
        // Check if the file matches any of the target extensions
        if ((TARGET_FILE_NAME === "" || item === TARGET_FILE_NAME) && isTargetExtension(item)) {
          console.log(`📝 Exporting content from: ${itemPath}`);

          // Read the content of the file
          let fileContent = fs.readFileSync(itemPath, 'utf-8');

          // Transpile TypeScript to JavaScript and minify the content using esbuild
          fileContent = transpileAndMinifyWithEsbuild(fileContent);

          // Add a section for this file's minified code
          exportContent.push(`// File: ${itemPath}\n`);
          exportContent.push(fileContent);
        }

        // Skip ignored files
        if (IGNORE_FILES.has(item)) {
          return;
        }
      }
    });

  } catch (error) {
    console.error(`Error scanning directory ${currentPath}:`, error.message);
  }
}

function isTargetExtension(filename) {
  // Check if the filename ends with any of the target extensions
  return TARGET_EXTENSIONS.some(ext => filename.endsWith(ext));
}

function transpileAndMinifyWithEsbuild(content) {
  try {
    // Use esbuild to transpile TypeScript to JavaScript and minify the content
    const result = esbuild.transformSync(content, {
      loader: 'tsx', // Treat the content as TypeScript
      minify: true, // Enable minification
      target: 'esnext', // Use the latest JavaScript features
    });

    return result.code; // Return the minified and transpiled code
  } catch (error) {
    console.error('❌ Error transpiling or minifying with esbuild:', error);
    return content; // Return the original content if there's an error
  }
}

function writeContentToFiles(content, fileCount) {
  let currentFileContent = '';
  content.forEach((line, index) => {
    currentFileContent += line + '\n';

    // If the content exceeds MAX_FILE_SIZE, create a new file
    if (currentFileContent.length >= MAX_FILE_SIZE) {
      const fileName = `${BASE_EXPORT_FILE_NAME}_${fileCount}.txt`;
      fs.writeFileSync(fileName, currentFileContent);
      console.log(`📝 Writing to file: ${fileName}`);
      fileCount++; // Increment the file counter
      currentFileContent = ''; // Reset the content for the next file
    }
  });

  // Write any remaining content to a final file
  if (currentFileContent.length > 0) {
    const fileName = `${BASE_EXPORT_FILE_NAME}_${fileCount}.txt`;
    fs.writeFileSync(fileName, currentFileContent);
    console.log(`📝 Writing to file: ${fileName}`);
  }
}

// Run the export generation
generateExport();
