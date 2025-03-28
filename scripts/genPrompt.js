/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configure paths
const ROOT_DIR = path.join(__dirname, '..');
const MODULES_DIR = path.join(ROOT_DIR, 'src', 'shared', 'modules');
const EXPORT_DIR = path.join(ROOT_DIR, 'module_exports');

// Enhanced template with AI research instructions
const TEMPLATES = {
  aiPrompt: (ctx) => {
    const needsDBInstruction = ctx.needsDB 
      ? `- Database Model: ${ctx.prismaModel} (Prisma schema required)`
      : `- Database Model: [RESEARCH AND DETERMINE if this module needs database storage]`;
    
    const needsAPIInstruction = ctx.needsAPI
      ? '- API Routes: Required (implement Next.js API routes)'
      : '- API Routes: [RESEARCH AND DETERMINE if this module needs API endpoints]';
    
    const dependenciesInstruction = ctx.dependencies.length
      ? `- Dependencies: ${ctx.dependencies.join(', ')} (already exists in project)`
      : '- Dependencies: [RESEARCH AND DETERMINE if this module depends on other modules]';

    return `# RepairRadar Module Generation Request

## Module Specifications
- Name: ${ctx.moduleName}
- Component: ${ctx.ComponentName}Page
- Description: ${ctx.description}
${needsDBInstruction}
${dependenciesInstruction}

## Technical Requirements
### Architecture Decisions Needed
${needsAPIInstruction}
- State Management: [RESEARCH AND DETERMINE if Zustand or React Context is more appropriate]
- Form Handling: [RESEARCH AND DETERMINE if React Hook Form is needed]

### File Structure Guidance
\`\`\`
${ctx.moduleName}/
├── components/
│   ├── ${ctx.ComponentName}Page.tsx
│   └── [DETERMINE if additional subcomponents are needed]
├── types.ts
├── [RESEARCH if hooks.ts is needed for custom hooks]
${ctx.needsAPI ? '├── api/\n│   └── route.ts' : '[DETERMINE if API routes folder is needed]'}
└── README.md
\`\`\`

### Research-Based Implementation
1. Analyze the module description "${ctx.description}" and:
   - Determine optimal data structure
   - Identify required CRUD operations
   - Design appropriate UI components

2. Based on your analysis:
${!ctx.needsDB && !ctx.needsAPI ? `   - [RESEARCH] Does this module need:
   * Database persistence?
   * API endpoints?
   * Both?
   * Neither?` : ''}

3. Create component structure:
\`\`\`tsx
// ${ctx.ComponentName}Page.tsx
"use client";
import { useTenantData } from "@/shared/lib/hooks";
${ctx.dependencies.map(d => `import { use${d}Data } from "@/shared/modules/${d}/hooks";`).join('\n')}
${!ctx.dependencies.length ? '// [RESEARCH if additional imports are needed]' : ''}

export default function ${ctx.ComponentName}Page({ tenant }: { tenant: string }) {
  // [RESEARCH AND IMPLEMENT data fetching logic]
  return (
    <div className="space-y-4">
      {/* [DESIGN appropriate UI based on module purpose] */}
    </div>
  );
}
\`\`\`

## Research Directives
1. If database need is unspecified:
   - Analyze the module's data persistence requirements
   - Recommend appropriate Prisma models if needed
   - Or suggest client-side state if sufficient

2. If API need is unspecified:
   - Determine if server-side processing is required
   - Identify necessary API endpoints
   - Or confirm client-side only implementation

3. For all unspecified aspects:
   - Make reasonable assumptions based on module purpose
   - Document your decisions in code comments
   - Suggest alternatives if appropriate

## Quality Requirements
- Comprehensive JSDoc explaining research decisions
- TypeScript interfaces reflecting data needs
- [RESEARCH appropriate error handling patterns]
- [DETERMINE optimal loading state implementations]
- Mobile-responsive design by default
`;
  },

  moduleGenerator: (ctx) => ({
    name: ctx.moduleName,
    files: [
      {
        path: `components/${ctx.ComponentName}Page.tsx`,
        content: `import { useTenantData } from "@/shared/lib/hooks";
${ctx.dependencies.map(d => `import { use${d}Data } from "@/shared/modules/${d}/hooks";`).join('\n')}

export default function ${ctx.ComponentName}Page({ tenant }: { tenant: string }) {
  return (
    <div className="space-y-4">
      {/* ${ctx.ComponentName} implementation - AI to complete */}
    </div>
  );
}`
      },
      {
        path: 'types.ts',
        content: `export interface ${ctx.ComponentName} {
  id: string;
  tenantId: string;
${ctx.dependencies.map(d => `  ${d}Id?: string;`).join('\n')}
  // AI to add additional fields based on research
}`
      }
    ]
  })
};

// Template rendering function
function renderTemplate(templateFn, context) {
  return templateFn(context);
}

// Project scanning functions
function scanExistingModules() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs.readdirSync(MODULES_DIR).filter(module => {
    const modulePath = path.join(MODULES_DIR, module);
    return fs.statSync(modulePath).isDirectory() && 
           fs.existsSync(path.join(modulePath, 'components'));
  });
}

function scanPrismaModels() {
  const prismaSchemaPath = path.join(ROOT_DIR, 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaSchemaPath)) return [];
  const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
  const modelMatches = schemaContent.match(/model\s+(\w+)\s*\{/g);
  return modelMatches ? modelMatches.map(m => m.replace('model', '').replace('{', '').trim()) : [];
}

async function collectDependencies(existingModules) {
  const dependencies = [];
  let addMore = true;
  
  while (addMore) {
    console.log('Existing modules:', existingModules.map((m, i) => `[${i}] ${m}`).join(', '));
    const input = await ask('Add dependency (number/name/empty to finish): ');
    
    if (!input) {
      addMore = false;
    } else if (!isNaN(input) && existingModules[input]) {
      dependencies.push(existingModules[input]);
    } else {
      dependencies.push(input);
    }
  }
  return dependencies;
}

function ask(question, validate) {
  return new Promise(resolve => {
    const askFn = () => {
      readline.question(question, answer => {
        if (validate) {
          const error = validate(answer);
          if (error !== true) {
            console.log(`❌ ${error}`);
            return askFn();
          }
        }
        resolve(answer.trim());
      });
    };
    askFn();
  });
}

function kebabToPascal(str) {
  return str.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
}

async function main() {
  console.log('🚀 RepairRadar AI Module Generator\n');

  // Collect module information
  const existingModules = scanExistingModules();
  const prismaModels = scanPrismaModels();

  const context = {
    moduleName: await ask(
      'Module name (kebab-case): ',
      input => /^[a-z]+(-[a-z]+)*$/.test(input) || 'Use kebab-case'
    ),
    description: await ask('Module description: '),
    needsDB: (await ask('Needs DB model? (y/n): ')) === 'y',
    needsAPI: (await ask('Needs API routes? (y/n): ')) === 'y',
    dependencies: await collectDependencies(existingModules),
  };

  // Generate derived values
  context.ComponentName = kebabToPascal(context.moduleName);
  context.prismaModel = context.moduleName.replace(/-/g, '_');

  // Create output directory
  const exportPath = path.join(EXPORT_DIR, `${context.moduleName}_${Date.now()}`);
  fs.mkdirSync(exportPath, { recursive: true });

  // Generate AI prompt
  const promptPath = path.join(exportPath, 'AI_PROMPT.md');
  fs.writeFileSync(promptPath, renderTemplate(TEMPLATES.aiPrompt, context));
  console.log(`📝 AI Prompt generated at ${promptPath}`);

  // Generate starter files if requested
  if ((await ask('Generate starter files? (y/n): ')) === 'y') {
    const moduleFiles = TEMPLATES.moduleGenerator(context);
    moduleFiles.files.forEach(file => {
      const filePath = path.join(exportPath, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content);
      console.log(`📄 Generated ${file.path}`);
    });
  }

  console.log('\n✅ Generation complete!');
  console.log('1. Use the AI_PROMPT.md with your AI assistant');
  console.log('2. Implement any suggested starter files');
  console.log(`3. Place module in src/shared/modules/${context.moduleName}`);
  
  readline.close();
}

main().catch(err => {
  console.error('Error:', err);
  readline.close();
  process.exit(1);
});