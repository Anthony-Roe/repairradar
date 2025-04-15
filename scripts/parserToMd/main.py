import base64
from pathlib import Path
from tkinter import filedialog, Tk
from typing import Dict, List
import json
import logging
from datetime import datetime

import msgpack
from typescript import TypeScriptParser, TypeCodeEntity
from parser_prisma import PrismaExportParser, CodeEntity
import brotli
import csv

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("project_structure.log"), logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

NON_CRITICAL_DIRS = {".git", "__pycache__", "node_modules", "venv", ".venv",
                     "dist", "build", ".next", "out", ".ai-assistant", ".vscode",
                     "public", "scripts", "ui"}

class ProjectStructure:
    def __init__(self, root_dirs: List[Path]) -> None:
        logger.debug(f"Initializing ProjectStructure with {len(root_dirs)} root directories: {root_dirs}")
        self.root_dirs = root_dirs
        self.output_file = Path.cwd() / "project_structure.csv"
        self.structure: Dict[str, Dict] = {}
        self.imports: Dict[str, List[str]] = {}
        self.component_usages: Dict[str, List[str]] = {}
        self.all_entities: List[CodeEntity | TypeCodeEntity] = []
        
        self.ts_parser = TypeScriptParser()
        self.prisma_parser = PrismaExportParser()
        
        for root_dir in root_dirs:
            logger.debug(f"Building structure for root directory: {root_dir}")
            self.build_structure(root_dir)
        self.export_to_json()

    def build_structure(self, root_dir: Path) -> None:
        logger.debug(f"Starting build_structure for: {root_dir}")
        root_key = str(root_dir.name)
        if root_key not in self.structure:
            self.structure[root_key] = {}

        for path in root_dir.rglob("*"):
            if path.name in NON_CRITICAL_DIRS:
                logger.debug(f"Skipping non-critical path: {path.name}")
                continue
            if any(part in NON_CRITICAL_DIRS for part in path.parts) or path.name in NON_CRITICAL_DIRS:
                continue

            if path.is_dir():
                relative_path = path.relative_to(root_dir)
                current_level = self.structure[root_key]
                for part in relative_path.parts:
                    if part not in current_level:
                        current_level[part] = {}
                    current_level = current_level[part]

                full_path = str(root_dir.name / relative_path).replace('\\', '/')
                visible_files = [
                    f.name for f in path.iterdir()
                    if f.is_file() and not f.name.startswith('.') and f.suffix in ('.ts', '.tsx', '.prisma')
                ]

                if not visible_files:
                    continue

                logger.debug(f"Visible files in {full_path}: {visible_files}")
                if full_path not in self.imports:
                    self.imports[full_path] = []
                    self.component_usages[full_path] = []

                current_level["files"] = current_level.get("files", {})
                for file in visible_files:
                    file_path = path / file
                    logger.debug(f"Processing file: {file_path}")
                    if file.endswith('.prisma'):
                        logger.error(f"Skipping unsupported Prisma file: {file_path}")
                        entities = self.prisma_parser.parse_prisma_file(str(file_path), self.all_entities)
                        logger.debug(f"Parsed {len(entities)} Prisma entities from {file_path}")
                    else:
                        entities = self.ts_parser.parse_typescript_file(str(file_path), self.all_entities)
                        logger.debug(f"Parsed {len(entities)} TS entities from {file_path}")

                    current_level["files"][file] = entities

    def export_to_csv(self, data: dict, output_file: str = "project_structure.csv"):
        """
        Exports a dictionary to a CSV file, flattening the project structure into rows for each entity.
        
        Args:
            data (dict): The dictionary containing 'generated_at', 'summary', and 'directories'.
            output_file (str): Path to the output CSV file (default: 'project_structure.csv').
        """
        # Prepare CSV headers
        headers = [
            "generated_at", "file_path", "entity_name", "entity_type", "signature",
            "line_no", "return_type", "imports", "component_usages"
        ]
        
        rows = []
        
        # Extract summary (optional: could write to separate file)
        summary = data.get("summary", {})
        
        # Extract generated_at
        generated_at = data.get("generated_at", "")
        
        # Flatten directories
        def _flatten_directories(d: Dict, parent_path: str = ""):
            if "files" in d:
                imports = ",".join(d.get("imports", []))  # Join list to string
                component_usages = ",".join(d.get("component_usages", []))
                for file_name, entities in d["files"].items():
                    file_path = f"{parent_path}/{file_name}" if parent_path else file_name
                    for entity in entities:
                        rows.append({
                            "generated_at": generated_at,
                            "file_path": file_path,
                            "entity_name": entity.get("name", ""),
                            "entity_type": entity.get("type", ""),
                            "signature": entity.get("signature", ""),
                            "line_no": entity.get("line_no", ""),
                            "return_type": entity.get("return_type", ""),
                            "imports": imports,
                            "component_usages": component_usages
                        })
            # Recurse into subdirectories
            for key, value in d.items():
                if isinstance(value, dict) and key != "files":
                    new_path = f"{parent_path}/{key}" if parent_path else key
                    _flatten_directories(value, new_path)
        
        # Process directories
        directories = data.get("directories", {})
        for root_name, root_dict in directories.items():
            _flatten_directories(root_dict, root_name)
        
        # Write to CSV
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()
            
            # Optional: Write summary as a special row
            if summary:
                summary_row = {
                    "generated_at": generated_at,
                    "file_path": "SUMMARY",
                    "entity_name": "",
                    "entity_type": "summary",
                    "signature": "",
                    "line_no": "",
                    "return_type": "",
                    "imports": "",
                    "component_usages": f"files:{summary.get('files', 0)},models:{summary.get('models', 0)},components:{summary.get('components', 0)},hooks:{summary.get('hooks', 0)},functions:{summary.get('functions', 0)},enums:{summary.get('enums', 0)}"
                }
                writer.writerow(summary_row)
            
            # Write entity rows
            for row in rows:
                writer.writerow(row)

    def export_to_json(self) -> None:
        """
        Processes project structure and exports it as CSV.
        """
        logger.debug("Starting export_to_json")
        
        summary_counts = {
            "files": 0,
            "models": 0,
            "components": 0,
            "hooks": 0,
            "functions": 0,
            "enums": 0,
        }

        for entity in self.all_entities:
            summary_counts["files"] += 1 if entity.type in {"typescript", "prisma"} else 0
            t = entity.type.lower()
            if "model" in t:
                summary_counts["models"] += 1
            elif "component" in t:
                summary_counts["components"] += 1
            elif "hook" in t:
                summary_counts["hooks"] += 1
            elif "function" in t:
                summary_counts["functions"] += 1
            elif "enum" in t:
                summary_counts["enums"] += 1

        output_data = {
            "generated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "summary": summary_counts,
            "directories": self.structure
        }

        logger.debug(f"Summary: {summary_counts}")

        for root_name, root_dict in self.structure.items():
            def _populate_metadata(d: Dict, parent_path: str = root_name):
                if "files" in d:
                    full_path = parent_path
                    d["imports"] = self.imports.get(full_path, [])
                    d["component_usages"] = self.component_usages.get(full_path, [])
                    for file, entities in d["files"].items():
                        d["files"][file] = [
                            {
                                "name": entity.name,
                                "type": entity.type,
                                "signature": entity.signature if len(str(entity.signature)) < 500 else entity.signature,
                                "line_no": entity.line_no,
                                **({"return_type": entity.return_type} if entity.return_type else {})
                            } for entity in entities
                        ]
                for key, value in d.items():
                    if isinstance(value, dict) and key != "files":
                        _populate_metadata(value, f"{parent_path}/{key}")

            _populate_metadata(root_dict)

        # Export to CSV instead of MessagePack
        self.export_to_csv(output_data, self.output_file)
        
    def _flatten_dict(self, d: Dict) -> List[Dict]:
        result = [d] if "files" in d else []
        for value in d.values():
            if isinstance(value, dict):
                result.extend(self._flatten_dict(value))
        return result
    
class TruncatingJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, dict):
            return {
                k: (v if isinstance(v, (int, float)) or len(str(v)) < 200 else "truncated")
                for k, v in o.items()
            }
        return super().default(o)


if __name__ == "__main__":
    root = Tk()
    root.withdraw()
    
    logger.info("Select multiple project directories to analyze (Cancel when done)")
    directories = []
    while True:
        dir_path = filedialog.askdirectory(title="Select project directory (Cancel when done)")
        if not dir_path:
            break
        directories.append(Path(dir_path))
    
    if not directories:
        logger.error("No directories selected. Exiting...")
        exit()
    
    logger.info("Analyzing project structure and TypeScript files...")
    ProjectStructure(directories)