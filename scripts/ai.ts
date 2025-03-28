import { Ollama } from "@langchain/ollama";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import chokidar from "chokidar";

// Configuration
const CONFIG = {
  MODEL: "codellama:13b",
  OLLAMA_URL: "http://localhost:11434",
  PROJECT_ROOT: path.resolve("E:\\Dev\\websites\\repairradar\\src"),
  LEARNING_DIR: path.resolve("E:\\Dev\\websites\\repairradar", ".ai-assistant"),
  IGNORE_PATTERNS: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
  MAX_CONTEXT_FILES: 50,
  MAX_FILE_SIZE: 50000 // 50KB
};

// Type definitions
type CodeLearning = {
  filePath: string;
  concepts: string[];
  patterns: string[];
  dependencies: string[];
  timestamp: string;
};

interface ProjectKnowledge {
  architecture: string[];
  patterns: string[];
  conventions: string[];
  dependencies: string[];
}

// State management with proper initialization
const projectState = {
  knowledge: {
    architecture: [] as string[],
    patterns: [] as string[],
    conventions: [] as string[],
    dependencies: [] as string[]
  },
  learnings: [] as CodeLearning[],
  lastProcessedFiles: new Set<string>()
};

// Initialize Ollama
const ollama = new Ollama({
  model: CONFIG.MODEL,
  baseUrl: CONFIG.OLLAMA_URL,
  temperature: 0.1
});

// Enhanced JSON parsing with better error handling
async function safeJsonParse(jsonString: string): Promise<any> {
  try {
    // First try to parse directly
    return JSON.parse(jsonString);
  } catch (initialError) {
    try {
      // Try to extract JSON from response
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error("Invalid JSON format " + (initialError as Error).message);

      // Clean and fix common JSON issues
      const extracted = jsonString.slice(jsonStart, jsonEnd)
        .replace(/'/g, '"') // Convert single quotes to double
        .replace(/(\w+)\s*:/g, '"$1":') // Ensure proper key quoting
        .replace(/:\s*([^"\s][^,}]*)([,}])/g, ': "$1"$2') // Quote unquoted values
        .replace(/,\s*}/g, '}'); // Remove trailing commas

      return JSON.parse(extracted);
    } catch (fixError) {
      console.error("JSON parse error:", fixError instanceof Error ? fixError.message : String(fixError));
      return null;
    }
  }
}

// Robust file analysis with proper error handling
async function analyzeCodeFile(filePath: string, content: string): Promise<CodeLearning> {
  const prompt = `Analyze this code file and return ONLY a valid JSON object with:
  - concepts: array of architectural concepts (max 3)
  - patterns: array of code patterns (max 3)
  - dependencies: array of dependencies (optional)
  
  Example response:
  {
    "concepts": ["MVC architecture"],
    "patterns": ["Factory pattern"],
    "dependencies": ["express"]
  }

  File: ${filePath}
  Code:
  ${content.substring(0, CONFIG.MAX_FILE_SIZE)}`;

  try {
    const response = await ollama.invoke(prompt);
    const parsed = await safeJsonParse(response);
    
    // Validate the response structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Invalid response format " + parsed);
    }

    // Ensure all properties are arrays of strings
    return {
      filePath,
      concepts: Array.isArray(parsed.concepts) ? 
        parsed.concepts.filter((c: any) => typeof c === 'string' && c.trim()) : [],
      patterns: Array.isArray(parsed.patterns) ? 
        parsed.patterns.filter((p: any) => typeof p === 'string' && p.trim()) : [],
      dependencies: Array.isArray(parsed.dependencies) ? 
        parsed.dependencies.filter((d: any) => typeof d === 'string' && d.trim()) : [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Analysis failed for ${filePath}:`, error instanceof Error ? error.message : String(error));
    return {
      filePath,
      concepts: [],
      patterns: [],
      dependencies: [],
      timestamp: new Date().toISOString()
    };
  }
}

// File processing utilities
function isCodeFile(filePath: string): boolean {
  const ignored = ['.d.ts', '.json', '.config.', '.spec.', '.test.'];
  return !ignored.some(ext => filePath.includes(ext)) && 
         ['.ts', '.tsx', '.js', '.jsx'].some(ext => filePath.endsWith(ext));
}

async function scanProject(): Promise<{path: string, content: string}[]> {
  const files: {path: string, content: string}[] = [];
  const scanQueue = [CONFIG.PROJECT_ROOT];
  
  while (scanQueue.length > 0) {
    const currentDir = scanQueue.pop()!;
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(CONFIG.PROJECT_ROOT, fullPath);

      if (entry.isDirectory()) {
        if (!CONFIG.IGNORE_PATTERNS.some(p => fullPath.includes(p))) {
          scanQueue.push(fullPath);
        }
      } else if (isCodeFile(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          files.push({ path: relativePath, content });
        } catch (error) {
          console.error(`Error reading ${fullPath}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  return files;
}

// Knowledge management with proper type safety
function updateKnowledgeBase(learning: CodeLearning) {
  // Ensure all arrays are properly initialized
  if (!Array.isArray(projectState.knowledge.architecture)) {
    projectState.knowledge.architecture = [];
  }
  if (!Array.isArray(projectState.knowledge.patterns)) {
    projectState.knowledge.patterns = [];
  }
  if (!Array.isArray(projectState.knowledge.dependencies)) {
    projectState.knowledge.dependencies = [];
  }

  // Filter and validate all inputs
  const validConcepts = learning.concepts.filter(c => c.trim());
  const validPatterns = learning.patterns.filter(p => p.trim());
  const validDeps = learning.dependencies.filter(d => d.trim());

  // Update knowledge with deduplication
  projectState.knowledge.architecture = [
    ...new Set([...projectState.knowledge.architecture, ...validConcepts])
  ];
  projectState.knowledge.patterns = [
    ...new Set([...projectState.knowledge.patterns, ...validPatterns])
  ];
  projectState.knowledge.dependencies = [
    ...new Set([...projectState.knowledge.dependencies, ...validDeps])
  ];
}

async function processProjectFiles() {
  const files = await scanProject();
  
  for (const file of files.slice(0, CONFIG.MAX_CONTEXT_FILES)) {
    if (projectState.lastProcessedFiles.has(file.path)) continue;
    
    try {
      const learning = await analyzeCodeFile(file.path, file.content);
      projectState.learnings.push(learning);
      updateKnowledgeBase(learning);
      projectState.lastProcessedFiles.add(file.path);
    } catch (error) {
      console.error(`Error processing ${file.path}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  await saveKnowledge();
}

// Knowledge persistence
async function saveKnowledge() {
  try {
    await fs.mkdir(CONFIG.LEARNING_DIR, { recursive: true });
    await Promise.all([
      fs.writeFile(
        path.join(CONFIG.LEARNING_DIR, 'learnings.json'),
        JSON.stringify(projectState.learnings, null, 2)
      ),
      fs.writeFile(
        path.join(CONFIG.LEARNING_DIR, 'knowledge.json'),
        JSON.stringify(projectState.knowledge, null, 2)
      )
    ]);
  } catch (error) {
    console.error("Error saving knowledge:", error instanceof Error ? error.message : String(error));
  }
}

async function loadKnowledge() {
  try {
    const [learnings, knowledge] = await Promise.all([
      fs.readFile(path.join(CONFIG.LEARNING_DIR, 'learnings.json'), 'utf-8')
        .catch(() => '[]'),
      fs.readFile(path.join(CONFIG.LEARNING_DIR, 'knowledge.json'), 'utf-8')
        .catch(() => JSON.stringify({
          architecture: [],
          patterns: [],
          conventions: [],
          dependencies: []
        }))
    ]);
    
    projectState.learnings = JSON.parse(learnings);
    projectState.knowledge = JSON.parse(knowledge);
    projectState.lastProcessedFiles = new Set(projectState.learnings.map(l => l.filePath));
  } catch (error) {
    console.error("Error loading knowledge:", error instanceof Error ? error.message : String(error));
  }
}

// User interface
function showKnowledgeSummary() {
  console.log(chalk.green.bold("\n📚 Code Knowledge Summary"));
  console.log(`📂 Project: ${path.basename(CONFIG.PROJECT_ROOT)}`);
  console.log(`📝 Files Analyzed: ${projectState.learnings.length}`);
  
  console.log(chalk.blue.bold("\n🏗️ Architecture:"));
  projectState.knowledge.architecture.forEach((c, i) => 
    console.log(` ${i + 1}. ${c}`));
  
  console.log(chalk.blue.bold("\n🔄 Patterns:"));
  projectState.knowledge.patterns.forEach((p, i) => 
    console.log(` ${i + 1}. ${p}`));
  
  if (projectState.knowledge.dependencies.length > 0) {
    console.log(chalk.blue.bold("\n📦 Dependencies:"));
    projectState.knowledge.dependencies.forEach((d, i) => 
      console.log(` ${i + 1}. ${d}`));
  }
}

// File watcher
function setupFileWatcher() {
  const watcher = chokidar.watch(CONFIG.PROJECT_ROOT, {
    ignored: CONFIG.IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', async (filePath) => {
    const relativePath = path.relative(CONFIG.PROJECT_ROOT, filePath);
    console.log(chalk.gray(`\n🔄 Detected change: ${relativePath}`));
    
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const learning = await analyzeCodeFile(relativePath, content);
      
      // Update or add learning
      const index = projectState.learnings.findIndex(l => l.filePath === relativePath);
      if (index >= 0) {
        projectState.learnings[index] = learning;
      } else {
        projectState.learnings.push(learning);
      }
      
      updateKnowledgeBase(learning);
      await saveKnowledge();
      console.log(chalk.green("  ✔ Updated knowledge base"));
    } catch (error) {
      console.error(chalk.red("  ✖ Error processing change:"), error instanceof Error ? error.message : String(error));
    }
  });
}

// Main execution
async function main() {
  console.log(chalk.green.bold("\n🤖 Code Learning Assistant"));
  console.log(chalk.gray(`Model: ${CONFIG.MODEL} | Watching: ${CONFIG.PROJECT_ROOT}\n`));
  
  await loadKnowledge();
  setupFileWatcher();
  
  console.log(chalk.blue("Starting initial analysis..."));
  await processProjectFiles();
  
  showKnowledgeSummary();
  
  console.log(chalk.gray("\nWatching for file changes..."));
  console.log(chalk.gray("Press Ctrl+C to exit"));
}

main().catch(error => {
  console.error("Fatal error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});