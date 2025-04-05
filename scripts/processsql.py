import os
from pathlib import Path
from typing import Dict, Any
import re

class PostgresScriptGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_runner(self):
        """Generate main Python migration runner"""
        script = '''#!/usr/bin/env python3
import os
import sys
import psycopg2
from pathlib import Path

class DatabaseMigrator:
    def __init__(self):
        self.conn_params = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": os.getenv("DB_PORT", "5432"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", "postgres"),
            "database": "postgres"  # Connect to default db first
        }

    def execute_sql(self, sql: str, database: str = "repairradar"):
        conn_params = self.conn_params.copy()
        conn_params["database"] = database
        
        try:
            with psycopg2.connect(**conn_params) as conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(sql)
        except psycopg2.Error as e:
            print(f"Error executing SQL: {e}")
            raise

    def run_migrations(self):
        # Create database if it doesn't exist
        try:
            self.execute_sql("""
                SELECT 'CREATE DATABASE repairradar'
                WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'repairradar');
            """)
        except psycopg2.Error as e:
            print(f"Error creating database: {e}")
            return

        # Run all migration files in order
        migration_dir = Path(__file__).parent
        for sql_file in sorted(migration_dir.glob("*.sql")):
            if sql_file.name.startswith("_"):  # Skip helper files
                continue
                
            print(f"Running migration: {sql_file.name}")
            try:
                with open(sql_file) as f:
                    self.execute_sql(f.read(), "repairradar")
            except psycopg2.Error as e:
                print(f"Error in {sql_file.name}: {e}")
                sys.exit(1)

    def reset_database(self):
        """Drop and recreate database, then run all migrations"""
        try:
            self.execute_sql("DROP DATABASE IF EXISTS repairradar;")
            self.execute_sql("CREATE DATABASE repairradar;")
            self.run_migrations()
        except psycopg2.Error as e:
            print(f"Error resetting database: {e}")
            sys.exit(1)

if __name__ == "__main__":
    migrator = DatabaseMigrator()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        print("Resetting database...")
        migrator.reset_database()
    else:
        print("Running migrations...")
        migrator.run_migrations()
'''
        with open(self.output_dir / "run_migrations.py", "w") as f:
            f.write(script)
        
        # Make executable
        (self.output_dir / "run_migrations.py").chmod(0o755)

    def generate_requirements(self):
        """Generate requirements.txt"""
        with open(self.output_dir / "requirements.txt", "w") as f:
            f.write("psycopg2-binary>=2.9.9\n")

def process_sql_file(input_file: str, output_dir: str):
    generator = PostgresScriptGenerator(output_dir)
    
    # Read input SQL
    with open(input_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    sections = {
        '001_init.sql': {
            'pattern': r'(SET .*?;|CREATE EXTENSION .*?;|CREATE TYPE .*?;)',
            'description': '''-- Initialize database and extensions
DO $$ 
BEGIN
'''
        },
        '002_functions.sql': {
            'pattern': r'(CREATE OR REPLACE FUNCTION .*?END;\s*\$\$ LANGUAGE plpgsql;)',
            'description': '-- Create utility functions'
        },
        # ... add other sections ...
    }

    # Process each section
    for filename, config in sections.items():
        matches = re.finditer(config['pattern'], sql, re.DOTALL | re.MULTILINE)
        output_sql = []
        
        for match in matches:
            sql_statement = match.group(1).strip()
            if sql_statement:
                output_sql.append(sql_statement)

        if output_sql:
            with open(generator.output_dir / filename, 'w', encoding='utf-8') as f:
                f.write(f"{config['description']}\n\n")
                f.write("\n\n".join(output_sql))
                if '001_init.sql' in filename:
                    f.write("\nEND $$;")

    # Generate Python scripts
    generator.generate_runner()
    generator.generate_requirements()

if __name__ == '__main__':
    process_sql_file('schema.sql', 'migrations')