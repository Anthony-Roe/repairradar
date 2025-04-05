#!/usr/bin/env python3
"""
SQL Dump Compressor with GUI File Selector
"""

import re
import sys
import argparse
from pathlib import Path
from tkinter import Tk, filedialog, messagebox
from tkinter.ttk import Progressbar, Label, Button, Frame
import threading

class SQLCompressorApp:
    def __init__(self, root):
        self.root = root
        root.title("SQL Dump Compressor")
        root.geometry("400x200")
        
        self.frame = Frame(root, padding="20")
        self.frame.pack(fill="both", expand=True)
        
        Label(self.frame, text="PostgreSQL Dump Compressor", font=('Arial', 14)).pack(pady=10)
        
        self.select_btn = Button(self.frame, text="Select SQL File", command=self.select_file)
        self.select_btn.pack(pady=5)
        
        self.compress_btn = Button(self.frame, text="Compress", state="disabled", command=self.compress_file)
        self.compress_btn.pack(pady=5)
        
        self.progress = Progressbar(self.frame, orient="horizontal", length=300, mode="determinate")
        self.progress.pack(pady=10)
        
        self.status = Label(self.frame, text="Select a .sql file to begin")
        self.status.pack()
        
        self.input_file = None
    
    def select_file(self):
        filetypes = (("SQL files", "*.sql"), ("All files", "*.*"))
        self.input_file = filedialog.askopenfilename(
            title="Select SQL dump file",
            initialdir=".",
            filetypes=filetypes
        )
        
        if self.input_file:
            self.status.config(text=f"Selected: {Path(self.input_file).name}")
            self.compress_btn.config(state="normal")
    
    def compress_file(self):
        if not self.input_file:
            return
            
        output_file = f"{Path(self.input_file).stem}_compressed.sql"
        save_path = filedialog.asksaveasfilename(
            title="Save compressed file",
            initialdir=".",
            initialfile=output_file,
            defaultextension=".sql",
            filetypes=(("SQL files", "*.sql"),)
        )
        
        if not save_path:
            return
            
        # Run compression in background thread
        self.progress["value"] = 0
        self.status.config(text="Compressing...")
        self.select_btn.config(state="disabled")
        self.compress_btn.config(state="disabled")
        
        thread = threading.Thread(
            target=self.run_compression,
            args=(self.input_file, save_path),
            daemon=True
        )
        thread.start()
    
    def run_compression(self, input_path, output_path):
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.update_progress(10)
            
            # Phase 1: Preserve dollar-quoted blocks
            dollar_blocks = []
            def save_dollar_blocks(match):
                dollar_blocks.append(match.group(0))
                return f"$$DOLLAR_BLOCK_{len(dollar_blocks)-1}$$"
            
            content = re.sub(r'\$\$.*?\$\$', save_dollar_blocks, content, flags=re.DOTALL)
            self.update_progress(20)
            
            # Phase 2: Remove comments
            content = re.sub(r'--.*?$', '', content, flags=re.MULTILINE)
            content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
            self.update_progress(30)
            
            # Phase 3: Collapse whitespace
            content = re.sub(r'[ \t]+', ' ', content)
            content = re.sub(r'\n+', '\n', content)
            content = content.strip()
            self.update_progress(60)
            
            # Phase 4: Restore dollar blocks
            for i, block in enumerate(dollar_blocks):
                content = content.replace(f"$$DOLLAR_BLOCK_{i}$$", block)
            self.update_progress(80)
            
            # Phase 5: Final cleanup
            content = re.sub(r';(?=\S)', '; ', content)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            self.update_progress(100)
            
            original_size = Path(input_path).stat().st_size
            compressed_size = Path(output_path).stat().st_size
            reduction = (1 - compressed_size/original_size) * 100
            
            self.status.config(text=f"Compressed: {reduction:.1f}% reduction")
            messagebox.showinfo(
                "Success",
                f"Compression complete!\n\n"
                f"Original: {original_size:,} bytes\n"
                f"Compressed: {compressed_size:,} bytes\n"
                f"Reduction: {reduction:.1f}%"
            )
            
        except Exception as e:
            self.status.config(text="Error during compression")
            messagebox.showerror("Error", f"Compression failed:\n{str(e)}")
        
        finally:
            self.select_btn.config(state="normal")
            self.compress_btn.config(state="disabled" if not self.input_file else "normal")
            self.progress["value"] = 0
    
    def update_progress(self, value):
        self.progress["value"] = value
        self.root.update_idletasks()

if __name__ == "__main__":
    root = Tk()
    app = SQLCompressorApp(root)
    root.mainloop()