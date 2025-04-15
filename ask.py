#!/usr/bin/env python3
# ask.py - Refactored version
import os
import re
import json
import time
import fnmatch
import requests
import threading
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Optional, Tuple, TypedDict
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuration
class FileCache(TypedDict):
    files: Dict[str, Dict[str, str|float]]
    last_updated: str

class TechStack(TypedDict):
    next: str
    prisma: str
    typescript: str
    auth: Optional[str]
    ui: str
    database: str

CONFIG = {
    "WEIGHT_CACHE": "weights.json",
    "MAX_FILE_SIZE": 8000,
    "MAX_CONTEXT_FILES": 10,
    "MAX_CONTEXT_TOKENS": 12000,
    "IGNORED_DIRS": {"node_modules", ".next", ".git", "dist", "__tests__", "public", "build", ".cache"},
    "IGNORED_FILE_PATTERNS": ["*.spec.*", "*.test.*", "*.d.ts"],
    "SUPPORTED_EXTENSIONS": (".ts", ".tsx", ".js", ".jsx", ".prisma", ".graphql", ".gql"),
    "OLLAMA_ENDPOINT": "http://localhost:11434/api/generate",
    "FALLBACK_OLLAMA_ENDPOINT": "http://localhost:11434/api/generate",
    "MODELS": {
        "primary": "codellama:13b",
        "fallback": "gemma3:4b",
        "file_selector": "gemma3:4b"
    },
    "PROJECT_DESCRIPTION": "A multi-tenant Computerized Maintenance Management System (CMMS) with Next.js, Prisma, and PostgreSQL",
    "DEFAULT_TECH_STACK": {
        "next": "14",
        "prisma": "5",
        "typescript": "5",
        "auth": None,
        "ui": "shadcn/ui",
        "database": "PostgreSQL"
    }
}

OLLAMA_PARAMS = {
    "rope_frequency_base": 1000000,
    "stop": [
        "[INST]",
        "[/INST]",
        "<<SYS>>",
        "<</SYS>>"
    ],
    
    #"temperature": 0.7,
    #"top_k": 50,
    #"top_p": 0.9,
    #"num_ctx": 16384,
    #"num_predict": 2048
}

class FileHandler:
    @staticmethod
    def is_valid_file(file_path: Path) -> bool:
        return (file_path.exists() and 
                file_path.suffix in CONFIG["SUPPORTED_EXTENSIONS"] and
                not any(fnmatch.fnmatch(file_path.name, pattern) 
                       for pattern in CONFIG["IGNORED_FILE_PATTERNS"]) and
                not any(ignored in str(file_path) 
                       for ignored in CONFIG["IGNORED_DIRS"]))

class OllamaClient:
    @staticmethod
    def call(model: str, prompt: str, max_retries: int = 3) -> Optional[str]:
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    CONFIG["OLLAMA_ENDPOINT"],
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": True,
                        "options": OLLAMA_PARAMS
                    },
                    timeout=30
                )
                response.raise_for_status()
                return response.json().get("response")
            except requests.exceptions.RequestException:
                if attempt == max_retries - 1:
                    raise
                time.sleep(1 + attempt)
        return None

class ProjectContextManager:
    def __init__(self):
        self.tech_stack = self._detect_tech_stack()
        self.weights = self._load_cache()
        self.active_files: Set[str] = set()
        self.recent_questions: List[Tuple[str, str]] = []
        self._init_file_watcher()
        self._init_git_info()
        self.ollama_available = self._validate_ollama_connection()

    def _init_file_watcher(self):
        try:
            from watchdog.observers import Observer
            handler = EnhancedFileChangeHandler(self)
            self.observer = Observer()
            self.observer.schedule(handler, path='.', recursive=True)
            self.observer.start()
            print("🔍 File watcher initialized")
        except Exception as e:
            print(f"⚠️ Failed to initialize file watcher: {e}")

    def _init_git_info(self):
        self.git_branch = self._get_git_branch()
        self.git_changes = self._get_git_changes()

    def _get_git_branch(self) -> str:
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip() or "main"
        except:
            return "main"

    def _get_git_changes(self) -> List[str]:
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                check=True
            )
            return [line.strip() for line in result.stdout.splitlines() if line.strip()]
        except:
            return []

    def _validate_ollama_connection(self) -> bool:
        endpoints = [CONFIG["OLLAMA_ENDPOINT"], CONFIG["FALLBACK_OLLAMA_ENDPOINT"]]
        for endpoint in endpoints:
            try:
                response = requests.get(endpoint.replace("/api/generate", "/api/tags"), timeout=5)
                if response.status_code == 200:
                    print(f"✅ Ollama connection established at {endpoint}")
                    return True
            except requests.RequestException:
                continue
        print("⚠️ Ollama connection failed - falling back to local context only")
        return False

    def _detect_tech_stack(self) -> TechStack:
        stack = CONFIG["DEFAULT_TECH_STACK"].copy()
        pkg_path = Path("package.json")
        
        if pkg_path.exists():
            try:
                with open(pkg_path) as f:
                    data = json.load(f)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    stack.update({
                        "next": deps.get("next", stack["next"]),
                        "prisma": deps.get("prisma", stack["prisma"]),
                        "typescript": deps.get("typescript", stack["typescript"]),
                        "auth": next((lib for lib in ["next-auth", "auth.js", "@kinde-oss/kinde-auth"] if lib in deps), None),
                        "ui": next((lib for lib in ["shadcn/ui", "@radix-ui", "@mui/material"] if lib in deps), "shadcn/ui")
                    })
            except Exception as e:
                print(f"⚠️ Error reading package.json: {e}")

        if Path("tailwind.config.js").exists():
            stack["styling"] = "Tailwind CSS"
        if Path("docker-compose.yml").exists():
            stack["containerization"] = "Docker"
        
        return stack

    def _load_cache(self) -> FileCache:
        cache_file = Path(CONFIG["WEIGHT_CACHE"])
        if cache_file.exists():
            try:
                with open(cache_file) as f:
                    data = json.load(f)
                    return {"files": data.get("files", {}), 
                            "last_updated": datetime.now().isoformat()}
            except Exception as e:
                print(f"⚠️ Error loading cache: {e}")
        return {"files": {}, "last_updated": datetime.now().isoformat()}

    def _save_cache(self):
        try:
            with open(CONFIG["WEIGHT_CACHE"], "w") as f:
                json.dump(self.weights, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ Error saving cache: {e}")

    def _score_file(self, file_path: Path) -> float:
        try:
            stat = file_path.stat()
            days_old = (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).days
            
            cache_entry = self.weights["files"].get(str(file_path), {})
            freq_score = cache_entry.get("weight", 0)
            recency_score = 1 / (days_old + 0.1)
            
            role = cache_entry.get("role", "").lower()
            role_multiplier = 1.5 if "schema" in role else 1.3 if "page" in role or "api" in role else 1.0
            size_penalty = min(1.0, (10000 / max(1, stat.st_size)))
            
            return (freq_score + recency_score) * role_multiplier * size_penalty
        except Exception as e:
            print(f"⚠️ Error scoring file {file_path}: {e}")
            return 0.0

    def track_file(self, file_path: str):
        path = Path(file_path)
        if not FileHandler.is_valid_file(path):
            return
            
        path_str = str(path)
        self.active_files.add(path_str)
        
        if path_str not in self.weights["files"]:
            self.weights["files"][path_str] = {
                "weight": 0,
                "role": self._infer_file_role(path),
                "last_accessed": datetime.now().isoformat()
            }
        
        self.weights["files"][path_str]["weight"] += 3
        self.weights["files"][path_str]["last_edited"] = datetime.now().isoformat()
        self._save_cache()

    def _infer_file_role(self, file_path: Path) -> str:
        path_str = str(file_path).lower()
        
        if "schema.prisma" in path_str:
            return "Prisma schema"
        elif "migrations/" in path_str:
            return "Database migration"
        elif "page." in path_str:
            return "Next.js API route" if "api/" in path_str else "Next.js page"
        elif "layout." in path_str:
            return "Next.js layout"
        elif "route." in path_str:
            return "Next.js route"
        elif "middleware." in path_str:
            return "Next.js middleware"
        elif "/components/" in path_str:
            return "UI component"
        elif "/hooks/" in path_str:
            return "Custom hook"
        elif "/lib/" in path_str:
            return "Shared utilities"
        elif "/utils/" in path_str or "/helpers/" in path_str:
            return "Utility functions"
        elif "/providers/" in path_str:
            return "Context providers"
        elif "/types/" in path_str or "/interfaces/" in path_str:
            return "Type definitions"
        elif "/actions/" in path_str:
            return "Server actions"
        elif "/config/" in path_str:
            return "App config"
        elif "test" in path_str or "spec" in path_str:
            return "Test file"
        
        return "Project source file"

    def get_project_structure(self, max_depth: int = 3) -> str:
        structure = []
        root_path = Path(".")
        
        def walk_dir(path: Path, current_depth: int):
            if current_depth > max_depth:
                return
            if any(ignored in str(path) for ignored in CONFIG["IGNORED_DIRS"]):
                return
                
            try:
                for item in path.iterdir():
                    if item.is_dir():
                        walk_dir(item, current_depth + 1)
                    elif item.suffix in CONFIG["SUPPORTED_EXTENSIONS"]:
                        role = self.weights["files"].get(str(item), {}).get("role", self._infer_file_role(item))
                        structure.append(f"{item} - {role}")
            except Exception as e:
                print(f"⚠️ Error walking directory {path}: {e}")
        
        walk_dir(root_path, 0)
        return "\n".join(structure)

    def select_relevant_files(self, question: str, max_files: int = CONFIG["MAX_CONTEXT_FILES"]) -> List[Path]:
        if not self.ollama_available:
            return self._fallback_file_selection(max_files)
            
        project_structure = self.get_project_structure()
        prompt = f"""<start_of_turn>user
Project structure:
{project_structure}

Select up to {max_files} files relevant to: {question}
Return ONLY a JSON array of absolute file paths.
Example: ["src/app/page.tsx", "prisma/schema.prisma"]<end_of_turn>
<start_of_turn>model>"""
        
        try:
            response = OllamaClient.call(
                model=CONFIG["MODELS"]["file_selector"],
                prompt=prompt,
                max_retries=2
            )
            
            if not response:
                raise ValueError("Empty response")
                
            json_str = re.search(r'\[.*\]', response, re.DOTALL).group()
            files = json.loads(json_str)
            
            valid_files = []
            for f in files[:max_files]:
                if Path(f).exists():
                    valid_files.append(f)
                    if f not in self.weights["files"]:
                        self.weights["files"][f] = {
                            "weight": 0,
                            "role": self._infer_file_role(Path(f))
                        }
                    self.weights["files"][f]["weight"] += 1
                    self.weights["files"][f]["last_accessed"] = datetime.now().isoformat()
            
            self._save_cache()
            return valid_files
            
        except Exception as e:
            print(f"⚠️ Failed to select files: {e}. Using fallback.")
            return self._fallback_file_selection(max_files)

    def _fallback_file_selection(self, max_files: int) -> List[str]:
        all_files = []
        for root, _, files in os.walk("."):
            if any(ignored in root for ignored in CONFIG["IGNORED_DIRS"]):
                continue
                
            for file in files:
                if (file.endswith(CONFIG["SUPPORTED_EXTENSIONS"]) and
                    not any(fnmatch.fnmatch(file, pattern) for pattern in CONFIG["IGNORED_FILE_PATTERNS"])):
                    all_files.append(Path(root) / file)
        
        scored_files = sorted(
            [(f, self._score_file(f)) for f in all_files],
            key=lambda x: x[1],
            reverse=True
        )
        return [str(f) for f, _ in scored_files[:max_files]]

    def get_context(self, question: str, focus_files: List[str] = None) -> str:
        context_files = [Path(f) for f in (focus_files or self.select_relevant_files(question)) if Path(f).exists()]
        file_contents = []

        for file in context_files[:CONFIG["MAX_CONTEXT_FILES"]]:
            try:
                content = file.read_text(encoding='utf-8')[:CONFIG["MAX_FILE_SIZE"]]
                role = self.weights["files"].get(str(file), {}).get("role", self._infer_file_role(file))
                file_contents.append(f"// {file} - {role}\n```typescript\n{content}\n```")
            except Exception as e:
                print(f"⚠️ Error reading file {file}: {e}")
                continue

        context = [
            "<start_of_turn>user",
            "[PROJECT OVERVIEW]",
            CONFIG["PROJECT_DESCRIPTION"],
            "",
            "[TECH STACK]",
            f"* Framework: Next.js {self.tech_stack.get('next', '14')}",
            f"* Database: {self.tech_stack.get('database', 'PostgreSQL')} with Prisma {self.tech_stack.get('prisma', '5')}",
            f"* Language: TypeScript {self.tech_stack.get('typescript', '5')}",
            f"* Authentication: {self.tech_stack.get('auth', 'None') or 'Not configured'}",
            f"* UI Components: {self.tech_stack.get('ui', 'shadcn/ui')}",
            f"* Git Branch: {self.git_branch}",
            f"* Uncommitted Changes: {len(self.git_changes)} files",
            "",
            "[TASK DESCRIPTION]",
            f"* User Request: {question}",
            "",
            "[CONTEXT FILES]",
            *file_contents,
            "",
            "[INSTRUCTIONS]",
            "1. Provide complete, production-ready code solutions",
            "2. Include all necessary imports and type definitions",
            "3. Consider security and performance implications",
            "4. Follow the project's existing patterns and conventions",
            "<end_of_turn>",
            "<start_of_turn>model>",
        ]

        self.recent_questions.append((datetime.now().isoformat(), question))
        if len(self.recent_questions) > 3:
            self.recent_questions.pop(0)

        return "\n".join(context)

    def generate_code(self, question: str, context: str = None) -> str:
        if not context:
            context = self.get_context(question)
        
        if not self.ollama_available:
            return self._generate_fallback_response(question, context)
            
        try:
            response = OllamaClient.call(
                model=CONFIG["MODELS"]["primary"],
                prompt=context,
                max_retries=3
            ) or OllamaClient.call(
                model=CONFIG["MODELS"]["fallback"],
                prompt=context,
                max_retries=2
            ) or "Error: No response from any model"
            
            return self._post_process_response(response)
        except Exception as e:
            print(f"⚠️ Code generation failed: {e}")
            return self._generate_fallback_response(question, context)

    def _post_process_response(self, response: str) -> str:
        response = re.sub(r'```[^\S\r\n]*$', '', response)
        return re.sub(r'```(?!typescript|javascript|tsx|jsx|prisma)', '```typescript', response).strip()

    def _generate_fallback_response(self, question: str, context: str) -> str:
        return f"""// ⚠️ Unable to connect to Ollama
// Task: {question}
// Relevant files: {', '.join(list(self.active_files)[:3]) or 'None'}

export function generatedFallbackImplementation() {{
  throw new Error("Implementation not available in fallback mode");
}}"""

    def cleanup(self):
        try:
            if hasattr(self, 'observer'):
                self.observer.stop()
                self.observer.join()
            self._save_cache()
        except Exception as e:
            print(f"⚠️ Error during cleanup: {e}")

class EnhancedFileChangeHandler(FileSystemEventHandler):
    def __init__(self, context_manager):
        self.context_manager = context_manager
        self.debounce_timer = None
        self.debounce_interval = 2

    def on_modified(self, event):
        if not event.is_directory:
            self._debounce(event.src_path)

    def on_created(self, event):
        if not event.is_directory:
            self._debounce(event.src_path)

    def _debounce(self, file_path):
        if self.debounce_timer:
            self.debounce_timer.cancel()
        
        self.debounce_timer = threading.Timer(
            self.debounce_interval,
            self._process_file_change,
            args=(file_path,)
        )
        self.debounce_timer.start()

    def _process_file_change(self, file_path):
        try:
            path = Path(file_path)
            if FileHandler.is_valid_file(path):
                self.context_manager.track_file(file_path)
                print(f"📦 File updated: {file_path}")
        except Exception as e:
            print(f"⚠️ Error processing file change: {e}")

def main():
    import sys
    from argparse import ArgumentParser
    
    parser = ArgumentParser(description="Project Context Manager")
    parser.add_argument("question", nargs="?", help="Your question or task")
    parser.add_argument("--track", metavar="FILE", help="Track a specific file")
    parser.add_argument("--list-files", action="store_true", help="List tracked files")
    parser.add_argument("--update-tech", action="store_true", help="Update tech stack")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")
    
    args = parser.parse_args()
    context_manager = ProjectContextManager()
    
    try:
        if args.track:
            context_manager.track_file(args.track)
            print(f"✅ Tracked file: {args.track}")
        elif args.list_files:
            print("Tracked Files:")
            for file, data in sorted(context_manager.weights["files"].items(), 
                                   key=lambda x: x[1].get("weight", 0), reverse=True):
                print(f"- {file} (score: {data.get('weight', 0)}, role: {data.get('role', 'unknown')})")
        elif args.update_tech:
            context_manager.tech_stack = context_manager._detect_tech_stack()
            print("Updated Tech Stack:", json.dumps(context_manager.tech_stack, indent=2))
        elif args.question:
            context = context_manager.get_context(args.question)
            print("\nGenerated Code:\n")
            print(context_manager.generate_code(args.question, context))
        elif args.interactive or not any(vars(args).values()):
            while True:
                try:
                    question = input("\nAsk about your project (or 'quit'): ").strip()
                    if question.lower() in ('quit', 'exit'):
                        break
                    if question:
                        context = context_manager.get_context(question)
                        print("\n" + context_manager.generate_code(question, context))
                except KeyboardInterrupt:
                    print("\nUse 'quit' to exit")
                except Exception as e:
                    print(f"⚠️ Error: {e}")
    finally:
        context_manager.cleanup()

if __name__ == "__main__":
    main()
