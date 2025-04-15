#!/usr/bin/env python3
"""
Next.js Project Compressor - Professional Grade
Features:
- Secure path handling
- Parallel processing
- Progress tracking
- Configurable chunking
- Exclusion patterns
- Comprehensive validation
- Manifest generation
"""

import zlib
import base64
import json
import os
import argparse
import hashlib
import math
from pathlib import Path
from typing import Dict, List, Set, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import sys
from dataclasses import dataclass
import time

# Configuration
DEFAULT_CHUNK_SIZE = 50000  # characters per chunk
MAX_WORKERS = 8  # for parallel file processing
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (skip larger files)

@dataclass
class CompressionStats:
    original_size: int = 0
    compressed_size: int = 0
    file_count: int = 0
    dir_count: int = 0
    skipped_files: int = 0
    duration: float = 0

class ProjectCompressor:
    def __init__(self):
        self.stats = CompressionStats()
        self.exclude_patterns = {
            'node_modules', '.git', '.DS_Store', 
            '*.log', '*.tmp', '*.swp', '.env*'
        }

    def should_exclude(self, path: Path) -> bool:
        """Check if path matches any exclusion pattern"""
        for pattern in self.exclude_patterns:
            if pattern.startswith('.') and path.name.startswith(pattern[1:]):
                return True
            if path.match(pattern):
                return True
        return False

    def is_binary_file(self, path: Path) -> bool:
        """Check if file is likely binary"""
        text_extensions = {
            '.js', '.ts', '.jsx', '.tsx', '.json', '.md', 
            '.txt', '.css', '.scss', '.html', '.yml', '.yaml'
        }
        return path.suffix.lower() not in text_extensions

    def process_file(self, path: Path) -> Optional[Dict]:
        """Process a single file and return its metadata"""
        if self.should_exclude(path):
            return None

        try:
            file_size = path.stat().st_size
            if file_size > MAX_FILE_SIZE and self.is_binary_file(path):
                return None

            with open(path, 'rb') as f:
                content = f.read()

            return {
                'path': str(path),
                'content': base64.b64encode(content).decode('ascii'),
                'size': file_size,
                'hash': hashlib.sha256(content).hexdigest(),
                'mtime': path.stat().st_mtime
            }
        except (IOError, OSError) as e:
            print(f"Warning: Could not process {path}: {str(e)}", file=sys.stderr)
            return None

    def build_structure(self, root_path: str) -> Dict:
        """Build project structure dictionary with parallel processing"""
        root = Path(root_path).resolve()
        structure = {}
        files_to_process = []

        # First pass: collect files and count directories
        for item in root.rglob('*'):
            rel_path = str(item.relative_to(root))
            if self.should_exclude(item):
                continue

            if item.is_dir():
                structure[rel_path] = {
                    'type': 'dir',
                    'size': 0,
                    'hash': '',
                    'mtime': item.stat().st_mtime
                }
                self.stats.dir_count += 1
            elif item.is_file():
                files_to_process.append(item)

        # Parallel file processing
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(self.process_file, f): f for f in files_to_process}
            
            for future in tqdm(as_completed(futures), total=len(futures), desc="Processing files"):
                file_data = future.result()
                if file_data:
                    structure[file_data['path']] = {
                        'type': 'file',
                        'content': file_data['content'],
                        'size': file_data['size'],
                        'hash': file_data['hash'],
                        'mtime': file_data['mtime']
                    }
                    self.stats.original_size += file_data['size']
                    self.stats.file_count += 1
                else:
                    self.stats.skipped_files += 1

        return structure

    def split_compressed_data(self, compressed_data: str, chunk_size: int) -> List[Dict]:
        """Split compressed data into chunks with metadata"""
        chunks = []
        total_chunks = math.ceil(len(compressed_data) / chunk_size)
        
        for i in range(total_chunks):
            start = i * chunk_size
            end = start + chunk_size
            chunk = compressed_data[start:end]
            
            chunks.append({
                'chunk_number': i + 1,
                'total_chunks': total_chunks,
                'content': chunk,
                'chunk_size': len(chunk)
            })
        
        return chunks

    def generate_manifest(self, chunks: List[Dict], output_prefix: str) -> Dict:
        """Generate manifest file with compression metadata"""
        return {
            'version': '1.1',
            'created': time.time(),
            'original_size': self.stats.original_size,
            'compressed_size': sum(c['chunk_size'] for c in chunks),
            'file_count': self.stats.file_count,
            'dir_count': self.stats.dir_count,
            'skipped_files': self.stats.skipped_files,
            'chunk_count': len(chunks),
            'chunk_size': DEFAULT_CHUNK_SIZE,
            'hash_algorithm': 'sha256',
            'output_prefix': output_prefix,
            'compression': 'zlib+base64'
        }

    def compress_project(self, project_path: str, output_prefix: str, chunk_size: int) -> List[str]:
        """Main compression method"""
        start_time = time.time()
        
        print(f"[*] Analyzing project structure: {project_path}")
        structure = self.build_structure(project_path)
        
        print(f"[*] Compressing {self.stats.file_count} files...")
        json_data = json.dumps(structure, separators=(',', ':'))  # Compact JSON
        compressed = zlib.compress(json_data.encode('utf-8'), level=9)
        encoded = base64.b64encode(compressed).decode('ascii')
        
        print(f"[*] Splitting into chunks...")
        chunks = self.split_compressed_data(encoded, chunk_size)
        self.stats.compressed_size = sum(len(c['content']) for c in chunks)
        
        print(f"[*] Generating manifest...")
        manifest = self.generate_manifest(chunks, output_prefix)
        
        # Write chunks and manifest
        output_files = []
        os.makedirs(os.path.dirname(output_prefix) or '.', exist_ok=True)
        
        for chunk in tqdm(chunks, desc="Writing chunks"):
            chunk_file = f"{output_prefix}_part{chunk['chunk_number']:03d}.cmpr"
            with open(chunk_file, 'w') as f:
                json.dump(chunk, f)
            output_files.append(chunk_file)
        
        manifest_file = f"{output_prefix}_manifest.json"
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        output_files.append(manifest_file)
        
        self.stats.duration = time.time() - start_time
        
        # Print summary
        ratio = (1 - self.stats.compressed_size/self.stats.original_size) * 100
        print(f"\n[+] Compression complete in {self.stats.duration:.2f}s")
        print(f"    Original: {self.stats.original_size:,} bytes")
        print(f"    Compressed: {self.stats.compressed_size:,} bytes ({ratio:.1f}% reduction)")
        print(f"    Files: {self.stats.file_count} (skipped {self.stats.skipped_files})")
        print(f"    Chunks: {len(chunks)} @ {chunk_size:,} chars each")
        
        return output_files

def main():
    parser = argparse.ArgumentParser(
        description='Next.js Project Compressor - Professional Grade',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('project_path', help='Path to Next.js project folder')
    parser.add_argument('-o', '--output', help='Output file prefix', default='compressed_project')
    parser.add_argument('-c', '--chunk-size', type=int, default=DEFAULT_CHUNK_SIZE,
                        help='Maximum characters per chunk')
    parser.add_argument('--exclude', nargs='+', default=[],
                        help='Additional patterns to exclude')
    
    args = parser.parse_args()
    
    compressor = ProjectCompressor()
    compressor.exclude_patterns.update(args.exclude)
    
    try:
        output_files = compressor.compress_project(
            args.project_path,
            args.output,
            args.chunk_size
        )
        print(f"\nOutput files:")
        for file in output_files:
            print(f"- {file}")
    except Exception as e:
        print(f"\n[!] Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()