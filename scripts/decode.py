#!/usr/bin/env python3
"""
Next.js Project Decompressor - Professional Grade
Features:
- Secure path validation
- Manifest verification
- Parallel extraction
- Checksum validation
- Dry run mode
- Comprehensive error recovery
"""

import zlib
import base64
import json
import os
import argparse
import hashlib
import glob
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import sys
import time
from dataclasses import dataclass

# Configuration
MAX_WORKERS = 8  # for parallel file extraction
VERIFY_CHUNKS = True  # verify chunk integrity before processing

@dataclass
class DecompressionStats:
    files_restored: int = 0
    dirs_created: int = 0
    bytes_written: int = 0
    validation_errors: int = 0
    duration: float = 0

class ProjectDecompressor:
    def __init__(self):
        self.stats = DecompressionStats()
        self.manifest = None

    def validate_path(self, root: Path, rel_path: str) -> Path:
        """Validate and sanitize file paths to prevent directory traversal"""
        try:
            # Handle Windows absolute paths that might be stored in the structure
            if os.path.isabs(rel_path):
                # Convert to relative path by taking only the last parts
                rel_path_parts = Path(rel_path).parts[-3:]  # Keep last 3 path components
                rel_path = os.path.join(*rel_path_parts)
                
            abs_path = (root / rel_path).resolve()
            
            # Normalize path comparison for Windows
            if not os.path.normpath(str(abs_path)).startswith(os.path.normpath(str(root.resolve()))):
                raise ValueError(f"Path traversal attempt detected: {rel_path}")
                
            return abs_path
        except (ValueError, RuntimeError) as e:
            raise ValueError(f"Invalid path {rel_path}: {str(e)}")

    def load_manifest(self, manifest_path: str) -> Dict:
        """Load and validate manifest file"""
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Basic manifest validation
            required_fields = {
                'version', 'original_size', 'compressed_size',
                'file_count', 'chunk_count', 'hash_algorithm'
            }
            if not all(field in manifest for field in required_fields):
                raise ValueError("Manifest missing required fields")
            
            if manifest['version'] != '1.1':
                print(f"Warning: Manifest version {manifest['version']} may not be fully compatible")
            
            return manifest
        except (IOError, json.JSONDecodeError) as e:
            raise ValueError(f"Invalid manifest file: {str(e)}")

    def find_chunk_files(self, pattern: str) -> Tuple[List[str], Optional[str]]:
        """Find chunk files and detect manifest if available"""
        chunk_files = sorted(glob.glob(pattern))
        if not chunk_files:
            raise FileNotFoundError(f"No files matching pattern: {pattern}")
        
        # Try to find manifest file
        base_name = os.path.basename(chunk_files[0]).split('_part')[0]
        manifest_pattern = f"{base_name}_manifest.json"
        manifest_files = glob.glob(manifest_pattern)
        
        manifest_path = manifest_files[0] if manifest_files else None
        return chunk_files, manifest_path

    def verify_chunk(self, chunk_data: Dict, chunk_number: int, total_chunks: int) -> bool:
        """Verify chunk integrity"""
        if chunk_data.get('chunk_number') != chunk_number:
            print(f"Chunk number mismatch: expected {chunk_number}, got {chunk_data.get('chunk_number')}")
            return False
        
        if chunk_data.get('total_chunks') != total_chunks:
            print(f"Total chunks mismatch: expected {total_chunks}, got {chunk_data.get('total_chunks')}")
            return False
        
        if not isinstance(chunk_data.get('content'), str):
            print("Invalid chunk content type")
            return False
        
        return True

    def combine_chunks(self, chunk_files: List[str], manifest: Optional[Dict] = None) -> str:
        """Reassemble chunks with verification"""
        chunks = []
        total_chunks = manifest['chunk_count'] if manifest else None
        
        for i, chunk_file in enumerate(tqdm(sorted(chunk_files), desc="Loading chunks")):
            try:
                with open(chunk_file, 'r') as f:
                    chunk_data = json.load(f)
                
                if VERIFY_CHUNKS:
                    if not self.verify_chunk(chunk_data, i+1, total_chunks or len(chunk_files)):
                        raise ValueError(f"Chunk verification failed for {chunk_file}")
                
                chunks.append(chunk_data['content'])
            except (json.JSONDecodeError, KeyError) as e:
                raise ValueError(f"Invalid chunk file {chunk_file}: {str(e)}")
        
        if manifest and len(chunks) != manifest['chunk_count']:
            raise ValueError(f"Missing chunks - expected {manifest['chunk_count']}, found {len(chunks)}")
        
        return ''.join(chunks)

    def validate_structure(self, structure: Dict, root: Path) -> bool:
        """Validate the decompressed structure integrity"""
        valid = True
        
        for rel_path, data in tqdm(structure.items(), desc="Validating structure"):
            try:
                if data['type'] == 'file':
                    abs_path = self.validate_path(root, rel_path)
                    content = base64.b64decode(data['content'].encode('ascii'))
                    
                    # Size check
                    if len(content) != data['size']:
                        print(f"\nSize mismatch for {rel_path} (expected {data['size']}, got {len(content)})")
                        valid = False
                        self.stats.validation_errors += 1
                    
                    # Hash check
                    if hashlib.sha256(content).hexdigest() != data['hash']:
                        print(f"\nHash mismatch for {rel_path}")
                        valid = False
                        self.stats.validation_errors += 1
            except Exception as e:
                print(f"\nValidation error for {rel_path}: {str(e)}")
                valid = False
                self.stats.validation_errors += 1
        
        return valid

    def restore_file(self, root: Path, rel_path: str, data: Dict) -> bool:
        """Restore a single file"""
        try:
            abs_path = self.validate_path(root, rel_path)
            content = base64.b64decode(data['content'].encode('ascii'))
            
            # Ensure parent directory exists
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file content
            with open(abs_path, 'wb') as f:
                f.write(content)
            
            # Restore original mtime if available
            if 'mtime' in data:
                os.utime(abs_path, (data['mtime'], data['mtime']))
            
            self.stats.bytes_written += data['size']
            self.stats.files_restored += 1
            return True
        except Exception as e:
            print(f"\nFailed to restore {rel_path}: {str(e)}", file=sys.stderr)
            self.stats.validation_errors += 1
            return False

    def restore_directory(self, root: Path, rel_path: str, data: Dict) -> bool:
        """Create a directory"""
        try:
            abs_path = self.validate_path(root, rel_path)
            abs_path.mkdir(parents=True, exist_ok=True)
            
            # Restore original mtime if available
            if 'mtime' in data:
                os.utime(abs_path, (data['mtime'], data['mtime']))
            
            self.stats.dirs_created += 1
            return True
        except Exception as e:
            print(f"\nFailed to create directory {rel_path}: {str(e)}", file=sys.stderr)
            self.stats.validation_errors += 1
            return False

    def restore_structure(self, structure: Dict, output_path: str) -> bool:
        """Restore project structure with parallel processing"""
        root = Path(output_path).resolve()
        root.mkdir(parents=True, exist_ok=True)
        
        # First create all directories
        dirs = [(rel_path, data) for rel_path, data in structure.items() if data['type'] == 'dir']
        for rel_path, data in tqdm(dirs, desc="Creating directories"):
            self.restore_directory(root, rel_path, data)
        
        # Then process files in parallel
        files = [(rel_path, data) for rel_path, data in structure.items() if data['type'] == 'file']
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = []
            for rel_path, data in files:
                futures.append(executor.submit(self.restore_file, root, rel_path, data))
            
            for future in tqdm(as_completed(futures), total=len(files), desc="Restoring files"):
                future.result()  # Just wait for completion, errors are handled internally
        
        return self.stats.validation_errors == 0

    def decompress_project(self, input_pattern: str, output_path: Optional[str] = None,
                          verify_only: bool = False, force: bool = False) -> str:
        """Main decompression method"""
        start_time = time.time()
        
        try:
            # Find and validate chunks
            print(f"[*] Locating chunk files...")
            chunk_files, manifest_path = self.find_chunk_files(input_pattern)
            
            if manifest_path:
                print(f"[*] Found manifest file: {manifest_path}")
                self.manifest = self.load_manifest(manifest_path)
                print(f"    Project: {self.manifest.get('output_prefix', 'unknown')}")
                print(f"    Original size: {self.manifest['original_size']:,} bytes")
                print(f"    Files: {self.manifest['file_count']} (in {self.manifest['chunk_count']} chunks)")
            
            # Combine and decompress chunks
            print(f"[*] Combining {len(chunk_files)} chunks...")
            combined_data = self.combine_chunks(chunk_files, self.manifest)
            
            print(f"[*] Decompressing data...")
            compressed = base64.b64decode(combined_data.encode('ascii'))
            json_data = zlib.decompress(compressed).decode('utf-8')
            structure = json.loads(json_data)
            
            # Determine output path
            if not output_path:
                base_name = os.path.basename(chunk_files[0]).split('_part')[0]
                output_path = base_name + '_restored'
            
            # Validate structure
            print(f"[*] Validating project structure...")
            if not self.validate_structure(structure, Path(output_path)):
                if not force:
                    raise ValueError(f"Validation failed with {self.stats.validation_errors} errors (use --force to override)")
                print(f"Warning: Proceeding despite {self.stats.validation_errors} validation errors")
            
            if verify_only:
                print(f"\n[+] Verification successful")
                print(f"    Files: {len([x for x in structure.values() if x['type'] == 'file'])}")
                print(f"    Directories: {len([x for x in structure.values() if x['type'] == 'dir'])}")
                return ""
            
            # Restore files
            print(f"[*] Restoring to: {output_path}")
            if not force and Path(output_path).exists() and any(Path(output_path).iterdir()):
                raise ValueError(f"Output directory {output_path} exists and is not empty (use --force to override)")
            
            success = self.restore_structure(structure, output_path)
            
            self.stats.duration = time.time() - start_time
            
            # Print summary
            print(f"\n[+] Restoration {'completed' if success else 'finished with errors'} in {self.stats.duration:.2f}s")
            print(f"    Files restored: {self.stats.files_restored}")
            print(f"    Directories created: {self.stats.dirs_created}")
            print(f"    Data written: {self.stats.bytes_written:,} bytes")
            if self.stats.validation_errors > 0:
                print(f"    Validation errors: {self.stats.validation_errors}")
            
            return output_path if success else ""
        
        except Exception as e:
            print(f"\n[!] Error: {str(e)}", file=sys.stderr)
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description='Next.js Project Decompressor - Professional Grade',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('input_pattern', 
                       help='Chunk file pattern (e.g., "project_part*.cmpr")')
    parser.add_argument('-o', '--output', 
                       help='Output directory path')
    parser.add_argument('--verify', action='store_true',
                       help='Verify integrity without extracting')
    parser.add_argument('--force', action='store_true',
                       help='Override safety checks (existing files, validation errors)')
    
    args = parser.parse_args()
    
    decompressor = ProjectDecompressor()
    decompressor.decompress_project(
        args.input_pattern,
        args.output,
        args.verify,
        args.force
    )

if __name__ == "__main__":
    main()