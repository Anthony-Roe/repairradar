import importlib
import sys

required = {
    'zstandard': 'zstd',
    'msgpack': None,  # No specific attribute to check
    'tkinter': None
}

missing = []
for package, attr in required.items():
    try:
        mod = importlib.import_module(package)
        if attr and not hasattr(mod, attr):
            missing.append(f"{package} (missing {attr})")
    except ImportError:
        missing.append(package)

if missing:
    print("Missing dependencies:", ", ".join(missing))
    print("Install with: pip install", " ".join(missing))
    sys.exit(1)
else:
    print("All dependencies are installed!")