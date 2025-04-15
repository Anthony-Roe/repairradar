# askgui.py - Refactored version
import tkinter as tk
from tkinter import scrolledtext, filedialog, ttk
from PIL import Image, ImageTk
import os
import json
import threading
from queue import Queue
from datetime import datetime
from typing import List, Dict, Optional

import requests
from ask import ProjectContextManager, CONFIG, OLLAMA_PARAMS

class ChatWindow:
    def __init__(self, master):
        self.master = master
        self.text_area = scrolledtext.ScrolledText(
            master,
            wrap=tk.WORD,
            font=("Helvetica", 12),
            bg="white",
            fg="#333333",
            padx=10,
            pady=10,
            state='disabled'
        )
        self.text_area.pack(expand=True, fill="both")
        self._configure_tags()

    def _configure_tags(self):
        self.text_area.tag_config("user", foreground="#3498db")
        self.text_area.tag_config("assistant", foreground="#2ecc71")
        self.text_area.tag_config("system", foreground="#e74c3c")
        self.text_area.tag_config("file", foreground="#9b59b6")
        self.text_area.tag_config("streaming", foreground="#2ecc71", font=("Helvetica", 12, "italic"))

    def add_message(self, sender: str, message: str, is_streaming: bool = False):
        self.text_area.config(state='normal')
        if not is_streaming:
            sender_label = {
                "user": "You:",
                "assistant": "Assistant:",
                "system": "System:",
                "file": "File:"
            }.get(sender, "")
            self.text_area.insert(tk.END, f"{sender_label} ", sender)
        self.text_area.insert(tk.END, f"{message}\n\n", "streaming" if is_streaming else sender)
        self.text_area.see(tk.END)
        self.text_area.config(state='disabled')

    def update_streaming(self, message: str):
        self.text_area.config(state='normal')
        self.text_area.delete("end-2c linestart", "end-1c")
        self.text_area.insert(tk.END, message, "streaming")
        self.text_area.see(tk.END)
        self.text_area.config(state='disabled')

    def finalize_streaming(self):
        self.text_area.config(state='normal')
        self.text_area.tag_remove("streaming", "end-2c linestart", "end-1c")
        self.text_area.tag_add("assistant", "end-2c linestart", "end-1c")
        self.text_area.config(state='disabled')

class FileAttachmentPanel:
    def __init__(self, master, on_attach, on_remove):
        self.master = master
        self.on_attach = on_attach
        self.on_remove = on_remove
        self.frame = tk.Frame(master, bg="#f0f0f0")
        self.attached_files = []
        self._setup_ui()

    def _setup_ui(self):
        self.attach_button = tk.Button(
            self.frame,
            text="📎 Attach Files",
            command=self.on_attach,
            bg="#3498db",
            fg="white",
            relief="flat",
            font=("Helvetica", 10)
        )
        self.attach_button.pack(side="left", padx=(0, 5))

    def update_attachments(self, files: List[str]):
        for widget in self.frame.winfo_children()[1:]:
            widget.destroy()
        
        if not files:
            return
            
        label = tk.Label(
            self.frame,
            text="Attached Files:",
            font=("Helvetica", 10),
            bg="#f0f0f0"
        )
        label.pack(side="left")
        
        for i, file_path in enumerate(files):
            file_frame = tk.Frame(self.frame, bg="#f0f0f0")
            file_frame.pack(side="left", padx=5)
            
            file_label = tk.Label(
                file_frame,
                text=os.path.basename(file_path),
                font=("Helvetica", 10),
                bg="#e0e0e0",
                padx=5,
                pady=2
            )
            file_label.pack(side="left")
            
            remove_btn = tk.Button(
                file_frame,
                text="×",
                command=lambda idx=i: self.on_remove(idx),
                bg="#e74c3c",
                fg="white",
                font=("Helvetica", 8, "bold"),
                bd=0,
                relief="flat",
                padx=2
            )
            remove_btn.pack(side="left", padx=(5, 0))

class ToolsMenu:
    def __init__(self, master, context_manager, on_refresh, on_clear, on_export):
        self.master = master
        self.context_manager = context_manager
        self.on_refresh = on_refresh
        self.on_clear = on_clear
        self.on_export = on_export
        self.window = None

    def show(self):
        if self.window and self.window.winfo_exists():
            self.window.destroy()
            
        self.window = tk.Toplevel(self.master)
        self.window.title("Context Tools")
        self.window.geometry("400x500")
        
        notebook = ttk.Notebook(self.window)
        notebook.pack(expand=True, fill="both")
        
        # Project Info Tab
        info_tab = ttk.Frame(notebook)
        notebook.add(info_tab, text="Project Info")
        
        tech_frame = ttk.LabelFrame(info_tab, text="Tech Stack")
        tech_frame.pack(fill="x", padx=5, pady=5)
        
        tech_text = tk.Text(tech_frame, height=6, wrap=tk.WORD, font=("Helvetica", 10))
        tech_text.pack(fill="both", expand=True, padx=5, pady=5)
        tech_text.insert(tk.END, json.dumps(self.context_manager.tech_stack, indent=2))
        tech_text.config(state='disabled')
        
        files_frame = ttk.LabelFrame(info_tab, text="Tracked Files")
        files_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        self.files_tree = ttk.Treeview(files_frame, columns=("weight", "role"), show="headings")
        self.files_tree.heading("#0", text="File")
        self.files_tree.heading("weight", text="Score")
        self.files_tree.heading("role", text="Role")
        
        vsb = ttk.Scrollbar(files_frame, orient="vertical", command=self.files_tree.yview)
        hsb = ttk.Scrollbar(files_frame, orient="horizontal", command=self.files_tree.xview)
        self.files_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        
        self.files_tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        
        files_frame.grid_rowconfigure(0, weight=1)
        files_frame.grid_columnconfigure(0, weight=1)
        self._populate_files()
        
        # Actions Tab
        actions_tab = ttk.Frame(notebook)
        notebook.add(actions_tab, text="Actions")
        
        ttk.Button(actions_tab, text="Refresh Tech Stack", command=self.on_refresh).pack(fill="x", padx=5, pady=5)
        ttk.Button(actions_tab, text="Clear Conversation", command=self.on_clear).pack(fill="x", padx=5, pady=5)
        ttk.Button(actions_tab, text="Export Conversation", command=self.on_export).pack(fill="x", padx=5, pady=5)

    def _populate_files(self):
        self.files_tree.delete(*self.files_tree.get_children())
        sorted_files = sorted(
            self.context_manager.weights["files"].items(),
            key=lambda x: x[1].get("weight", 0),
            reverse=True
        )
        for file_path, data in sorted_files[:50]:
            self.files_tree.insert(
                "",
                tk.END,
                text=file_path,
                values=(data.get("weight", 0), data.get("role", "Unknown")[:100])
            )

class ContextManagerGUI:
    def __init__(self, root, context_manager):
        self.root = root
        self.context_manager = context_manager
        self.response_queue = Queue()
        self.conversation_history = []
        self.attached_files = []
        self.streaming_active = False
        self.current_streaming_message = ""
        self.current_user_input = ""
        
        self._setup_ui()
        self._start_response_consumer()

    def _setup_ui(self):
        self.root.title("CMMS Project Assistant")
        self.root.geometry("1000x700")
        self.root.configure(bg="#f0f0f0")
        self.root.grid_rowconfigure(1, weight=1)
        self.root.grid_columnconfigure(0, weight=1)
        
        # Header
        header_frame = tk.Frame(self.root, bg="#2c3e50", padx=10, pady=10)
        header_frame.grid(row=0, column=0, sticky="ew")
        
        self.logo_img = self._load_image("assets/logo.png", (40, 40))
        logo_label = tk.Label(header_frame, image=self.logo_img, bg="#2c3e50")
        logo_label.pack(side="left")
        
        title_label = tk.Label(
            header_frame, 
            text="CMMS Project Assistant", 
            font=("Helvetica", 16, "bold"), 
            fg="white", 
            bg="#2c3e50"
        )
        title_label.pack(side="left", padx=10)
        
        # Chat Window
        self.chat_window = ChatWindow(tk.Frame(self.root, bg="white"))
        self.chat_window.master.grid(row=1, column=0, sticky="nsew", padx=10, pady=5)
        
        # Input Area
        input_frame = tk.Frame(self.root, bg="#f0f0f0", padx=10, pady=10)
        input_frame.grid(row=2, column=0, sticky="ew")
        
        # File Attachment
        self.file_panel = FileAttachmentPanel(
            input_frame,
            self._attach_files,
            self._remove_attachment
        )
        self.file_panel.frame.pack(fill="x", pady=(0, 5))
        
        # Input Text
        self.input_text = scrolledtext.ScrolledText(
            input_frame,
            height=4,
            wrap=tk.WORD,
            font=("Helvetica", 12),
            bg="white",
            fg="#333333",
            padx=10,
            pady=10
        )
        self.input_text.pack(expand=True, fill="both", pady=(5, 0))
        self.input_text.bind("<Return>", self._handle_enter_key)
        
        # Buttons
        button_frame = tk.Frame(input_frame, bg="#f0f0f0")
        button_frame.pack(fill="x", pady=(5, 0))
        
        self.stop_button = tk.Button(
            button_frame,
            text="⏹ Stop",
            command=self._stop_streaming,
            bg="#e74c3c",
            fg="white",
            font=("Helvetica", 10),
            state='disabled'
        )
        self.stop_button.pack(side="right", padx=(5, 0))
        
        self.send_button = tk.Button(
            button_frame,
            text="Send",
            command=self._send_message,
            bg="#27ae60",
            fg="white",
            font=("Helvetica", 12, "bold"),
            width=10
        )
        self.send_button.pack(side="right")
        
        self.tools_button = tk.Button(
            button_frame,
            text="⚙️ Tools",
            command=self._show_tools_menu,
            bg="#7f8c8d",
            fg="white",
            font=("Helvetica", 10)
        )
        self.tools_button.pack(side="left")
        
        # Status Bar
        self.status_bar = tk.Label(
            self.root,
            text="Ready",
            bd=1,
            relief=tk.SUNKEN,
            anchor=tk.W,
            font=("Helvetica", 10),
            bg="#ecf0f1",
            fg="#2c3e50"
        )
        self.status_bar.grid(row=3, column=0, sticky="ew")
        
        # Tools Menu
        self.tools_menu = ToolsMenu(
            self.root,
            self.context_manager,
            self._refresh_tech_stack,
            self._clear_conversation,
            self._export_conversation
        )

    def _load_image(self, path, size):
        try:
            img = Image.open(path)
            img = img.resize(size, Image.Resampling.LANCZOS)
            return ImageTk.PhotoImage(img)
        except:
            img = Image.new('RGB', size, color="#2c3e50")
            return ImageTk.PhotoImage(img)

    def _handle_enter_key(self, event):
        if not event.state & 0x1:  # If Shift not pressed
            self._send_message()
            return "break"

    def _attach_files(self):
        files = filedialog.askopenfilenames(
            title="Select Project Files",
            filetypes=[("Source Files", "*.ts *.tsx *.js *.jsx *.prisma"), ("All Files", "*.*")]
        )
        if files:
            self.attached_files = list(files)
            self.file_panel.update_attachments(self.attached_files)
            for file_path in self.attached_files:
                self.context_manager.track_file(file_path)
                self.chat_window.add_message("file", f"Attached: {file_path}")

    def _remove_attachment(self, index):
        if 0 <= index < len(self.attached_files):
            self.attached_files.pop(index)
            self.file_panel.update_attachments(self.attached_files)

    def _start_response_consumer(self):
        def consume_responses():
            while True:
                try:
                    response = self.response_queue.get()
                    if response == "STOP":
                        break
                    if self.root.winfo_exists():
                        self.root.after(0, self._update_streaming_message, response)
                    self.response_queue.task_done()
                except Exception as e:
                    print(f"Error in consumer thread: {e}")
                    break
                    
        threading.Thread(
            target=consume_responses,
            daemon=True,
            name="ResponseConsumer"
        ).start()

    def _send_message(self):
        if self.streaming_active:
            return
            
        user_input = self.input_text.get("1.0", tk.END).strip()
        if not user_input and not self.attached_files:
            return
            
        self.current_user_input = user_input
        self.chat_window.add_message("user", user_input)
        self.input_text.delete("1.0", tk.END)
        
        # Start streaming response
        self._start_streaming_response(user_input)

    def _start_streaming_response(self, user_input):
        self.streaming_active = True
        self.send_button.config(state='disabled')
        self.stop_button.config(state='normal')
        self.current_streaming_message = ""
        
        self.chat_window.add_message("assistant", "", is_streaming=True)
        
        threading.Thread(
            target=self._stream_model_response,
            args=(user_input,),
            daemon=True
        ).start()
        
        self._update_streaming_ui()

    def _update_streaming_ui(self):
        if not self.streaming_active:
            return
            
        while not self.response_queue.empty():
            chunk = self.response_queue.get()
            if chunk == "END":
                self._finalize_streaming_response()
                return
            self.current_streaming_message += chunk
            self.response_queue.task_done()
        
        self.chat_window.update_streaming(self.current_streaming_message)
        self.root.after(100, self._update_streaming_ui)

    def _stream_model_response(self, user_input):
        try:
            context = self.context_manager.get_context(user_input, self.attached_files)
            
            response = requests.post(
                CONFIG["OLLAMA_ENDPOINT"],
                json={
                    "model": CONFIG["MODELS"]["primary"],
                    "prompt": context,
                    "stream": True,
                    "options": OLLAMA_PARAMS
                },
                stream=True
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if not self.streaming_active:
                    break
                if line:
                    chunk = json.loads(line.decode('utf-8'))
                    if 'response' in chunk:
                        self.response_queue.put(chunk['response'])
                        
            self.response_queue.put("END")
        except Exception as e:
            self.response_queue.put(f"\n\nError: {str(e)}")
            self.response_queue.put("END")

    def _update_streaming_message(self, chunk):
        self.current_streaming_message += chunk

    def _finalize_streaming_response(self):
        self.streaming_active = False
        self.send_button.config(state='normal')
        self.stop_button.config(state='disabled')
        
        self.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "user": self.current_user_input,
            "assistant": self.current_streaming_message,
            "files": self.attached_files.copy()
        })
        
        self.chat_window.finalize_streaming()
        self._update_status("Ready")

    def _stop_streaming(self):
        self.streaming_active = False
        self.stop_button.config(state='disabled')
        self.send_button.config(state='normal')
        self._finalize_streaming_response()

    def _show_tools_menu(self):
        self.tools_menu.show()

    def _refresh_tech_stack(self):
        self.context_manager.tech_stack = self.context_manager._detect_tech_stack()
        self.tools_menu.show()
        self._update_status("Tech stack refreshed")

    def _clear_conversation(self):
        self.chat_window.text_area.config(state='normal')
        self.chat_window.text_area.delete("1.0", tk.END)
        self.chat_window.text_area.config(state='disabled')
        self.conversation_history = []
        self._update_status("Conversation cleared")

    def _export_conversation(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON Files", "*.json"), ("Text Files", "*.txt"), ("All Files", "*.*")]
        )
        if file_path:
            try:
                with open(file_path, "w") as f:
                    json.dump(self.conversation_history, f, indent=2)
                self._update_status(f"Exported to {file_path}")
            except Exception as e:
                self._update_status(f"Export failed: {str(e)}")

    def _update_status(self, message):
        self.status_bar.config(text=message)

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    root = tk.Tk()
    context_manager = ProjectContextManager()
    gui = ContextManagerGUI(root, context_manager)
    gui.run()