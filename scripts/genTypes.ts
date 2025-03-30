import fs from 'fs';

interface TableSchema {
  columns: { name: string; type: string; nullable: boolean; defaultValue?: string }[];
  primaryKey?: string[];
  foreignKeys: { column: string; references: { table: string; column: string } }[];
}

function parseSQLSchema(sql: string): { tables: Record<string, TableSchema>; functions: string[] } {
  const tables: Record<string, TableSchema> = {};
  const functions: string[] = [];

  // Normalize SQL by removing comments and excessive whitespace
  const normalizedSql = sql
    .replace(/--.*?\n/g, '')
    .replace(/\/\*.*?\*\//gs, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Improved CREATE TABLE regex
  const createTableRegex = /CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(([\s\S]+?)\)\s*(?:WITH\s*\([^)]+\))?\s*;/gi;
  
  let tableMatch;
  while ((tableMatch = createTableRegex.exec(normalizedSql)) !== null) {
    const tableName = tableMatch[1].replace(/"/g, '');
    const columnsDef = tableMatch[2].trim();

    tables[tableName] = { columns: [], foreignKeys: [], primaryKey: [] };

    // Split columns by commas, handling nested parentheses
    const columnDefs = splitColumns(columnsDef);

    for (const colDef of columnDefs) {
      // Parse column definition
      const colMatch = colDef.match(/^\s*([^\s]+)\s+([^\s(]+)(?:\([^)]+\))?\s*(.*?)\s*$/i);
      if (!colMatch) continue;

      const colName = colMatch[1].replace(/"/g, '');
      const colType = colMatch[2].toUpperCase();
      const colConstraints = colMatch[3];

      // Determine nullability (default is nullable unless NOT NULL is specified)
      const nullable = !/\bNOT\s+NULL\b/i.test(colConstraints);
      
      // Check for default value
      const defaultValueMatch = colConstraints.match(/\bDEFAULT\s+([^\s,]+)/i);
      const defaultValue = defaultValueMatch?.[1];

      tables[tableName].columns.push({
        name: colName,
        type: mapPgTypeToTs(colType),
        nullable,
        defaultValue
      });

      // Check for primary key
      if (/\bPRIMARY\s+KEY\b/i.test(colConstraints)) {
        tables[tableName].primaryKey?.push(colName);
      }
    }

    // Parse table-level constraints
    const tableConstraints = columnDefs.filter(def => 
      def.trim().startsWith('CONSTRAINT') || 
      def.trim().startsWith('PRIMARY KEY') ||
      def.trim().startsWith('FOREIGN KEY')
    );

    for (const constraint of tableConstraints) {
      // Primary key
      const pkMatch = constraint.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        tables[tableName].primaryKey = pkMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
      }

      // Foreign key
      const fkMatch = constraint.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        tables[tableName].foreignKeys.push({
          column: fkMatch[1].replace(/"/g, ''),
          references: {
            table: fkMatch[2].replace(/"/g, ''),
            column: fkMatch[3].replace(/"/g, '')
          }
        });
      }
    }
  }

  // Parse functions
  const functionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\s\S]+?)\s*RETURNS\s+[\s\S]+?\s*AS\s*\$\$[\s\S]+?\$\$\s*LANGUAGE\s+\w+\s*;/gi;
  let funcMatch;
  while ((funcMatch = functionRegex.exec(normalizedSql)) !== null) {
    functions.push(funcMatch[0]);
  }

  return { tables, functions };
}

function splitColumns(columnsDef: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of columnsDef) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

function mapPgTypeToTs(pgType: string): string {
  const typeMap: Record<string, string> = {
    'INT': 'number',
    'INTEGER': 'number',
    'SMALLINT': 'number',
    'BIGINT': 'number',
    'DECIMAL': 'number',
    'NUMERIC': 'number',
    'REAL': 'number',
    'DOUBLE PRECISION': 'number',
    'SERIAL': 'number',
    'BIGSERIAL': 'number',
    'BOOLEAN': 'boolean',
    'BOOL': 'boolean',
    'VARCHAR': 'string',
    'CHAR': 'string',
    'TEXT': 'string',
    'UUID': 'string',
    'TIMESTAMP': 'Date',
    'TIMESTAMPTZ': 'Date',
    'DATE': 'Date',
    'TIME': 'string',
    'TIMETZ': 'string',
    'INTERVAL': 'string',
    'JSON': 'any',
    'JSONB': 'any',
    'BYTEA': 'Buffer',
  };

  return typeMap[pgType.toUpperCase()] || 'unknown';
}

function generateTypes() {
  const { tables, functions } = parseSQLSchema(sql);
  let output = '// Auto-generated from SQL schema\n\n';

  // Generate TypeScript interfaces
  Object.entries(tables).forEach(([tableName, tableData]) => {
    output += `export interface ${toPascalCase(tableName)} {\n`;
    
    tableData.columns.forEach(col => {
      let type = col.type;
      if (col.nullable) type += ' | null';
      if (col.defaultValue) type += ` /* default: ${col.defaultValue} */`;
      
      output += `  ${col.name}: ${type};\n`;
    });
    
    output += '}\n\n';
  });

  // Generate relation mappings
  output += `export const relations = {\n`;
  Object.entries(tables).forEach(([tableName, tableData]) => {
    if (tableData.foreignKeys.length > 0) {
      output += `  ${tableName}: [\n`;
      tableData.foreignKeys.forEach(fk => {
        output += `    { from: '${fk.column}', to: '${fk.references.table}.${fk.references.column}' },\n`;
      });
      output += `  ],\n`;
    }
  });
  output += `};\n\n`;

  // Generate SQL query templates
  output += `export const queries = {\n`;
  Object.entries(tables).forEach(([tableName, tableData]) => {
    const pk = tableData.primaryKey?.[0] || 'id';
    output += `  ${tableName}: {\n`;
    output += `    getAll: \`SELECT * FROM ${tableName}\`,\n`;
    output += `    getById: \`SELECT * FROM ${tableName} WHERE ${pk} = $1\`,\n`;
    output += `    insert: \`INSERT INTO ${tableName} (${tableData.columns.map(c => c.name).join(', ')}) VALUES (${tableData.columns.map((_, i) => `$${i+1}`).join(', ')}) RETURNING *\`,\n`;
    output += `  },\n`;
  });
  output += `};\n\n`;

  // Generate function definitions
  if (functions.length > 0) {
    output += `export const functions = {\n`;
    functions.forEach(func => {
      const funcNameMatch = func.match(/FUNCTION\s+([^\s(]+)/i);
      const funcName = funcNameMatch?.[1] || 'anonymous';
      output += `  ${funcName}: \`${func.replace(/\n/g, ' ').trim()}\`,\n`;
    });
    output += `};\n`;
  }

  fs.writeFileSync('databaseSchema.ts', output);
  console.log('Schema file generated: databaseSchema.ts');
}

function toPascalCase(str: string): string {
  return str.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// Load SQL file
const sqlFilePath = 'schema.sql';
const sql = fs.readFileSync(sqlFilePath, 'utf8');

// Run the script
generateTypes();