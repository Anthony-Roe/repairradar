import base64
import ctypes
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Dict, Tuple
import zstandard as zstd
import msgpack
import hashlib
import zlib
import brotli
import traceback
import argparse

# --- Constants ---
NON_CRITICAL_DIRS = {".git", "__pycache__", "node_modules", "venv", ".venv", 
                    "dist", "build", ".next", "out", ".ai-assistant", ".vscode", 
                    "public", "scripts"}
NON_CRITICAL_FILES = {".pyc", ".pyo", ".log", "py", ".cache", ".DS_Store", 
                      ".env", ".map", ".git", ".gitignore", "yaml", ".sql", 
                      ".mjs", ".zip", ".7z", ".tar"}
CRITICAL_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".prisma", ".json", 
                       ".css", ".scss"}

# --- Progress Bar ---
class ProgressBar:
    def __init__(self, total: int, desc: str = "Processing"):
        self.total = total
        self.desc = desc
        self.start_time = time.time()
        
    def update(self, completed: int):
        elapsed = time.time() - self.start_time
        percent = min(100, (completed / self.total) * 100)
        bar = '█' * int(percent / 2) + '-' * (50 - int(percent / 2))
        print(f"\r{self.desc} |{bar}| {percent:.1f}% ({completed}/{self.total}) "
              f"[{elapsed:.1f}s]", end="", flush=True)
        
    def close(self):
        print()

# --- Admin Utilities ---
def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def take_ownership(path: Path) -> bool:
    """Take ownership of a file/folder (requires admin)"""
    try:
        if not path.exists():
            return False
        os.system(f'takeown /F "{path}" /R /A /D Y >nul 2>&1')
        os.system(f'icacls "{path}" /grant Administrators:F /T /C >nul 2>&1')
        return True
    except:
        return False

# --- Core Archiver ---
class ProjectArchiver:
    def __init__(self, max_chunk_size: int = 12000, compression_level: int = 22):
        self.max_chunk_size = max_chunk_size
        self.compression_level = min(max(compression_level, 1), 22)
        self.zstd_cctx = zstd.ZstdCompressor(level=self.compression_level, threads=-1)
        self.zstd_dctx = zstd.ZstdDecompressor()

    def is_critical(self, path: Path) -> bool:
        """Check if path should be included in archive"""
        if any(part in NON_CRITICAL_DIRS for part in path.parts):
            return False
        if path.is_file():
            return (path.suffix in CRITICAL_EXTENSIONS or 
                    path.suffix not in NON_CRITICAL_FILES)
        return True

    def get_project_files(self, project_path: Path) -> List[Path]:
        """Get all critical files with progress tracking"""
        print("🔍 Scanning project directory...")
        files = list(filter(self.is_critical, project_path.rglob('*')))
        return [f for f in files if f.is_file()]

    def _preprocess_file(self, file_path: Path) -> Tuple[Path, bytes]:
        """Preprocess file before compression"""
        try:
            raw_bytes = file_path.read_bytes()
            if file_path.suffix in CRITICAL_EXTENSIONS:
                return file_path, zlib.compress(raw_bytes, level=9)
            return file_path, raw_bytes
        except Exception as e:
            print(f"⚠️ Error reading {file_path}: {str(e)}")
            return file_path, b""

    def compress_project(self, project_path: Path) -> List[str]:
        """Compress with progress tracking"""
        files = self.get_project_files(project_path)
        if not files:
            raise ValueError("No files found to compress")
            
        project_data = {}
        raw_contents = []
        progress = ProgressBar(len(files), "Compressing")
        
        with ThreadPoolExecutor() as executor:
            futures = {executor.submit(self._preprocess_file, f): f for f in files}
            
            for i, future in enumerate(as_completed(futures), 1):
                file_path, preprocessed = future.result()
                if preprocessed:
                    content_hash = hashlib.sha256(preprocessed).hexdigest()
                    project_data[file_path.name] = {
                        "content": base64.b85encode(zstd.compress(preprocessed)).decode('ascii'),
                        "hash": content_hash,
                        "type": "text" if file_path.suffix in CRITICAL_EXTENSIONS else "binary",
                        "path": str(file_path.relative_to(project_path))
                    }
                    raw_contents.append(preprocessed)
                progress.update(i)
        
        progress.close()

        # Train dictionary if enough samples
        if len(raw_contents) > 1:
            try:
                dict_data = zstd.train_dictionary(512 * 1024, raw_contents)
                self.zstd_cctx = zstd.ZstdCompressor(
                    level=self.compression_level, 
                    dict_data=dict_data, 
                    threads=-1
                )
                project_data["__dict__"] = base64.b85encode(dict_data.as_bytes()).decode('ascii')
            except Exception as e:
                print(f"⚠️ Dictionary training failed: {str(e)}")

        print("📦 Final packaging...")
        json_str = msgpack.packb(project_data)
        compressed = self.zstd_cctx.compress(json_str)
        encoded = base64.b85encode(compressed).decode('ascii')
        
        return [encoded[i:i + self.max_chunk_size] 
                for i in range(0, len(encoded), self.max_chunk_size)]

    def save_compressed_project(self, project_path: Path, output_file: Path) -> None:
        """Save with progress tracking"""
        chunks = self.compress_project(project_path)
        with open(output_file, 'w', encoding='utf-8') as f:
            for i, chunk in enumerate(chunks, 1):
                f.write(chunk + '\n')
                print(f"\r📁 Saving chunk {i}/{len(chunks)}", end="")
        print("\n✅ Compression complete!")

    def decompress_project(self, chunks: List[str], output_path: Path) -> None:
        """Decompress with progress tracking"""
        print("🔓 Starting decompression...")
        combined = ''.join(chunks)
        compressed = base64.b85decode(combined.encode('ascii'))
        json_str = self.zstd_dctx.decompress(compressed)
        project_data = msgpack.unpackb(json_str, raw=False)

        if "__dict__" in project_data:
            dict_data = base64.b85decode(project_data.pop("__dict__").encode('ascii'))
            self.zstd_dctx = zstd.ZstdDecompressor(
                dict_data=zstd.ZstdCompressionDict(dict_data))

        output_path.mkdir(parents=True, exist_ok=True)
        total_files = len(project_data)
        progress = ProgressBar(total_files, "Decompressing")

        with ThreadPoolExecutor() as executor:
            futures = []
            for rel_path, data in project_data.items():
                file_path = output_path / data.get("path", rel_path)
                futures.append(executor.submit(self._write_file, file_path, data))

            for i, future in enumerate(as_completed(futures), 1):
                try:
                    future.result()
                except Exception as e:
                    print(f"\n⚠️ Error with {list(project_data.keys())[i-1]}: {str(e)}")
                progress.update(i)
        
        progress.close()
        print("✅ Decompression complete!")

    def _write_file(self, file_path: Path, data: dict) -> None:
        """Write with integrity check"""
        content = base64.b85decode(data["content"].encode('ascii'))
        content = zstd.decompress(content)
        
        if data["type"] == "text":
            content = zlib.decompress(content)
        
        if hashlib.sha256(content).hexdigest() != data["hash"]:
            raise RuntimeError("Integrity check failed")
        
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)

    @classmethod
    def load_and_decompress(cls, input_file: Path, output_path: Path) -> None:
        """Load compressed file and decompress to output directory"""
        with open(input_file, 'r', encoding='utf-8') as f:
            chunks = f.readlines()
        cls().decompress_project(chunks, output_path)

# Assuming other necessary imports are already included

def bcompress(src: Path, dest: Path, max_workers: int = 4, chunk_size: int = 65536, parse_percentage: float = 0.63) -> None:
    """
    Enhanced Brotli compression with:
    - Parallel processing
    - Memory-efficient chunking
    - Detailed error reporting
    - Progress tracking
    - Automatic retries
    """
    if not src.exists():
        raise FileNotFoundError(f"Source directory not found: {src}")

    # Get files with ownership check
    files = []
    for f in src.rglob('*'):
        if (f.is_file() 
            and not any(p in NON_CRITICAL_DIRS for p in f.parts)
            and f.suffix not in NON_CRITICAL_FILES):
            try:
                take_ownership(f)  # Ensure we have access
                files.append(f)
            except Exception as e:
                print(f"⚠️ Skipping {f}: {str(e)}")
                continue

    if not files:
        raise ValueError("No compressible files found")

    compressed = {}
    progress = ProgressBar(len(files), "Brotli Compressing")
    lock = threading.Lock()  # For thread-safe dict updates

    def process_file(f: Path) -> Tuple[str, bytes]:
        """Thread worker function with chunking logic"""
        try:
            with open(f, "rb") as file:
                file_size = os.path.getsize(f)
                parse_size = file_size * parse_percentage  # 63% of the file
                chunked_data = []

                while parse_size > 0:
                    # Read chunk from the file
                    chunk = file.read(chunk_size)
                    if not chunk:
                        break
                    chunked_data.append(brotli.compress(chunk, quality=11, mode=brotli.MODE_TEXT if f.suffix in CRITICAL_EXTENSIONS else brotli.MODE_GENERIC))
                    parse_size -= len(chunk)

                # Combine all the chunks for compression
                return (
                    str(f.relative_to(src)),
                    b"".join(chunked_data)
                )
        except Exception as e:
            print(f"\n⚠️ Processing failed for {f}: {str(e)}")
            return (None, None)

    # Parallel processing
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_file, f): f for f in files}

        for future in as_completed(futures):
            rel_path, compressed_data = future.result()
            if rel_path and compressed_data:
                with lock:
                    compressed[rel_path] = compressed_data
            progress.update(len(compressed))

    progress.close()

    # Write output with checksum
    try:
        
        write_compressed_data(compressed, dest, 0.0301)

    except Exception as e:
        if dest.exists():
            dest.unlink()  # Clean up partial output
        raise RuntimeError(f"Failed to write output: {str(e)}") from e

# TODO Rename this here and in `write_compressed_data`
def write_compressed_data(compressed, dest, max_file_size_in_mb):
    packed = msgpack.packb(compressed)
    checksum = hashlib.sha256(packed).hexdigest()

    # Convert max_file_size from MB to bytes
    max_file_size = int(max_file_size_in_mb * 1024 * 1024)  # Convert MB to bytes

    packed_size = len(packed)
    total_written = 0
    part_number = 1

        # Create a new destination path based on the part number if needed
    while total_written < packed_size:
            # Determine the output file path with a sequential part number
        dest_with_suffix = f"{dest.stem}_part{part_number}{dest.suffix}"
        with open(dest_with_suffix, "wb") as f:
            # Write the chunk to the file
            chunk = packed[total_written:total_written + max_file_size]
            f.write(chunk)
            total_written += len(chunk)

        print(f"✅ Part {part_number} saved to {dest_with_suffix}")
        print(f"📊 Stats: Written {total_written / 1024 / 1024:.2f} MB")

        part_number += 1  # Increment the part number for the next file

    print(f"🔒 Checksum: {checksum}")

    # Verify integrity of the written files (using checksum or comparing file sizes)
    verify_size = total_written
    if verify_size != packed_size:
        raise IOError(f"Write verification failed (expected {packed_size} bytes, got {verify_size})")

def read_and_reassemble_parts(base_path: Path):
    parts = sorted(base_path.parent.glob(f"{base_path.stem}_part*{base_path.suffix}"),
                   key=lambda p: int(p.stem.split('_part')[-1]))

    if not parts:
        raise FileNotFoundError(f"No parts found with base path {base_path.stem}_partN{base_path.suffix}")

    packed_data = bytearray()
    print("🔍 Found parts:", [p.name for p in parts])

    for part in parts:
        with open(part, "rb") as f:
            chunk = f.read()
            packed_data.extend(chunk)
            print(f"📦 Read {len(chunk)} bytes from {part.name}")

    return bytes(packed_data)

def verify_checksum(packed_data, expected_checksum):
    actual_checksum = hashlib.sha256(packed_data).hexdigest()
    if actual_checksum != expected_checksum:
        raise ValueError(f"Checksum mismatch! Expected {expected_checksum}, got {actual_checksum}")
    print(f"✅ Checksum verified: {actual_checksum}")

def restore_files(packed_data, output_folder: Path):
    decompressed_data = msgpack.unpackb(packed_data, strict_map_key=False)
    output_folder.mkdir(parents=True, exist_ok=True)

    for rel_path, content in decompressed_data.items():
        file_path = output_folder / rel_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)
        print(f"📁 Restored: {file_path}")

def decompress_and_restore(base_path: str, expected_checksum: str, restore_to: str):
    base_path = Path(base_path)
    restore_to = Path(restore_to)

    packed_data = read_and_reassemble_parts(base_path)
    verify_checksum(packed_data, expected_checksum)
    restore_files(packed_data, restore_to)

def main():
    decompress_and_restore(r"E:\Dev\websites\repairradar\scripts\archiver\upload.txt", r"14a128a3b7c3de8c5a6efded948bff4e24173f8844e4804298e09210f2352d5c", r"E:\Dev\websites\repairradar\scripts\archiver\brottest\decomp")
    return exit()

if __name__ == "__main__":
    main()