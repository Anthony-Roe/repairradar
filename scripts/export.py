import os
import zlib
import base64
from collections import Counter
from typing import Dict
from os import path

# Config constants
MAX_DICT = 1000
MIN_LEN = 4
EXTS = {'.ts', '.tsx', '.js', '.jsx', '.prisma'}
SKIP = {'node_modules', '.next', '.git'}

class CodeCompressor:
    def __init__(self):
        self.dict: Dict[str, str] = {}
        self.files = 0
        self.bytes = 0

    def scan(self, root: str) -> Dict[str, str]:
        """Scan and build dictionary from frequent terms"""
        freq = Counter()
        contents = {}
        
        for r, _, fs in os.walk(root):
            if any(s in r for s in SKIP):
                continue
            for f in fs:
                if not f.endswith(tuple(EXTS)):
                    continue
                p = path.join(r, f)
                with open(p, 'rb') as fd:
                    data = fd.read().decode('utf-8', 'ignore')
                    contents[p] = data
                    # Simple tokenization
                    for t in data.split():
                        if len(t) >= MIN_LEN and t.isalnum():
                            freq[t] += 1
        
        # Build compact dictionary
        self.dict = {k: chr(i) for i, (k, _) in enumerate(freq.most_common(MAX_DICT))}
        return contents

    def compress(self, p: str, data: str) -> bytes:
        """Efficient multi-layer compression"""
        # Dictionary encoding
        enc = ' '.join(self.dict.get(t, t) for t in data.split())
        # Combined compression
        cmp = base64.b85encode(zlib.compress(enc.encode('utf-8'), 9))
        # Minimal header with path
        out = f"{p}|{cmp.decode()}\n".encode()
        
        self.files += 1
        self.bytes += len(out)
        return out

    def export(self, root: str, out: str):
        """Minimal export pipeline"""
        files = self.scan(root)
        
        with open(out, 'wb') as f:
            # Compact dictionary header
            f.write(f"D:{','.join(f'{k}:{v}' for k,v in self.dict.items())}\n".encode())
            # Compressed files
            for p, data in files.items():
                f.write(self.compress(p, data))
        
        print(f"Done: {self.files}f, {self.bytes>>10}KB, {len(self.dict)}t")

    @staticmethod
    def verify(file: str):
        """Basic verification"""
        with open(file, 'rb') as f:
            dict_line = f.readline().decode().split('D:')[1]
            d = dict(kv.split(':') for kv in dict_line.split(','))
            
            for ln in f:
                if not ln.strip(): continue
                p, cmp = ln.decode().split('|', 1)
                try:
                    dec = zlib.decompress(base64.b85decode(cmp))
                    _ = ' '.join(d.get(t, t) for t in dec.decode().split())
                except Exception:
                    print(f"Fail: {p}")

if __name__ == "__main__":
    cmp = CodeCompressor()
    cmp.export("./src", "out.dzc")
    CodeCompressor.verify("out.dzc")