import base64
import zstandard as zstd
import json
import lzma
import hashlib
from pathlib import Path
from typing import Dict, Union
import brotli
import zlib

class Compressor:
    def __init__(self, max_chunk_size: int = 15000, compression_level: int = 22):
        """Initialize the compressor with configurable options."""
        self.max_chunk_size = max_chunk_size
        # Zstandard compression level (1-22, higher = better compression, slower)
        self.compression_level = min(max(compression_level, 1), 22)
        # Context for Zstandard with dictionary support
        self.zstd_cctx = zstd.ZstdCompressor(level=self.compression_level)
        self.zstd_dctx = zstd.ZstdDecompressor()

    def _preprocess_file(self, file_path: Path) -> bytes:
        """Preprocess file contents based on type for optimal compression."""
        raw_bytes = file_path.read_bytes()
        # For text-like files, try pre-compressing with zlib (good for redundancy)
        if file_path.suffix in {'.txt', '.json', '.csv', '.xml'}:
            return zlib.compress(raw_bytes, level=9)
        return raw_bytes

    def compress(self, files: Union[Path, list[Path]], use_dict: bool = True) -> list[str]:
        """Compress files into minimal-size, base85-encoded chunks.
        
        Args:
            files: Single Path or list of Paths to compress
            use_dict: Whether to train and use a Zstandard dictionary
            
        Returns:
            list of base85-encoded strings
        """
        # Normalize input
        if isinstance(files, Path):
            files = [files]
        if not files or not all(isinstance(f, Path) for f in files):
            raise ValueError("Invalid input: Provide a list of Path objects")

        # Build project data
        project_data: Dict[str, Dict[str, str]] = {}
        raw_contents: list[bytes] = []
        for f in files:
            if not f.is_file():
                raise ValueError(f"{f} is not a valid file")
            try:
                preprocessed = self._preprocess_file(f)
                content_hash = hashlib.sha256(preprocessed).hexdigest()  # Integrity check
                project_data[f.name] = {
                    "content": base64.b85encode(preprocessed).decode('ascii'),
                    "hash": content_hash,
                    "type": "text" if f.suffix in {'.txt', '.json', '.csv', '.xml'} else "binary"
                }
                raw_contents.append(preprocessed)
            except OSError as e:
                raise OSError(f"Failed to read {f}: {e}") from e

        # Optional: Train a Zstandard dictionary for better compression
        if use_dict and len(raw_contents) > 1:
            dict_data = zstd.train_dictionary(
                size_limit=1024 * 1024,  # 1MB dictionary
                samples=raw_contents
            )
            self.zstd_cctx = zstd.ZstdCompressor(level=self.compression_level, dict_data=dict_data)
            project_data["__dict__"] = base64.b85encode(dict_data.as_bytes()).decode('ascii')

        # Serialize and compress
        json_str = json.dumps(project_data, separators=(',', ':'))  # Minimize JSON size
        compressed = self.zstd_cctx.compress(json_str.encode('utf-8'))

        # Alternative compression: Try Brotli or LZMA if smaller
        brotli_compressed = brotli.compress(json_str.encode('utf-8'), quality=11)
        lzma_compressed = lzma.compress(json_str.encode('utf-8'))
        compressed = min(
            [compressed, brotli_compressed, lzma_compressed],
            key=len
        )

        # Encode and chunk
        encoded = base64.b85encode(compressed).decode('ascii')
        return [encoded[i:i + self.max_chunk_size] for i in range(0, len(encoded), self.max_chunk_size)]

    def decompress(self, chunks: list[str], output_path: Path) -> None:
        """Decompress chunks and restore files.
        
        Args:
            chunks: list of base85-encoded strings
            output_path: Directory to write decompressed files
        """
        if not chunks or not all(isinstance(c, str) for c in chunks):
            raise ValueError("Invalid chunks: Must be a list of strings")

        # Reassemble and decode
        combined = ''.join(chunks)
        compressed = base64.b85decode(combined.encode('ascii'))

        # Try decompressing with multiple algorithms (Zstd, Brotli, LZMA)
        json_str = None
        for method in [
            lambda x: self.zstd_dctx.decompress(x),
            lambda x: brotli.decompress(x),
            lambda x: lzma.decompress(x)
        ]:
            try:
                json_str = method(compressed).decode('utf-8')
                break
            except Exception:
                continue
        if json_str is None:
            raise RuntimeError("Failed to decompress: Unknown compression format")

        # Parse JSON and restore files
        project_data = json.loads(json_str)
        dict_data = project_data.pop("__dict__", None)
        if dict_data:
            self.zstd_dctx = zstd.ZstdDecompressor(
                dict_data=zstd.ZstdCompressionDict(base64.b85decode(dict_data.encode('ascii')))
            )

        output_path.mkdir(parents=True, exist_ok=True)
        for rel_path, data in project_data.items():
            file_path = output_path / rel_path
            content = base64.b85decode(data["content"].encode('ascii'))
            if data["type"] == "text":
                content = zlib.decompress(content)
            # Verify integrity
            if hashlib.sha256(content).hexdigest() != data["hash"]:
                raise RuntimeError(f"Integrity check failed for {rel_path}")
            file_path.write_bytes(content)

    def estimate_compression_ratio(self, files: list[Path], chunks: list[str]) -> float:
        """Calculate the compression ratio achieved."""
        original_size = sum(f.stat().st_size for f in files if f.is_file())
        compressed_size = sum(len(chunk.encode('ascii')) for chunk in chunks)
        return original_size / compressed_size if compressed_size > 0 else 1.0
