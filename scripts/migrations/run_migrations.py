#!/usr/bin/env python3
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
            "password": os.getenv("DB_PASSWORD", "pass"),
            "database": "postgres"  # Connect to default db first
        }

    def execute_sql(self, sql: str, database: str = "postgres"):
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
