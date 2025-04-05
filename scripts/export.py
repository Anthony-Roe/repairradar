import os
from typing import List, Optional, Set, Dict
import PySimpleGUI as sg

# Configuration
DEFAULT_CONFIG = {
    'BASE_EXPORT_FILE_NAME': 'code_export',
    'IGNORE_DIRS': {'dashboard', 'node_modules', ".next", "scripts", "migrations", ".vscode", ".ai-assistant"},
    'IGNORE_FILES': {"AssetMapEditor.tsx"},
    'TARGET_EXTENSIONS': {'.ts', '.prisma', '.tsx'},
    'MAX_CHARS': 50000,
    'RECENT_PATHS': []
}

class CodeExporter:
    def __init__(self):
        self.config = self.load_config()
        self.files: List[str] = []
        self.stats: Dict[str, int] = {
            'files_processed': 0,
            'files_skipped': 0,
            'errors': 0,
            'output_files': 0
        }

    def load_config(self) -> Dict:
        """Load configuration from file or use defaults"""
        # In a real app, you'd load from a config file here
        return DEFAULT_CONFIG.copy()

    def save_config(self):
        """Save configuration to file"""
        # In a real app, you'd save to a config file here
        pass

    def generate_export(self, target_path: str, specific_files: str, specific_dirs: str) -> str:
        """Main function to generate single-line file exports"""
        self.files = []
        self.stats = {k: 0 for k in self.stats.keys()}
        
        scan_path = target_path if target_path else os.getcwd()
        
        # Update recent paths
        if scan_path not in self.config['RECENT_PATHS']:
            self.config['RECENT_PATHS'].insert(0, scan_path)
            if len(self.config['RECENT_PATHS']) > 5:
                self.config['RECENT_PATHS'].pop()
        
        file_list = [f.strip() for f in specific_files.split(',')] if specific_files else None
        dir_list = [d.strip() for d in specific_dirs.split(',')] if specific_dirs else None

        self.scan_directory(scan_path, file_list, dir_list)
        self.write_output_files()

        return (
            f"✅ Export completed. Generated {self.stats['output_files']} file(s) starting with {self.config['BASE_EXPORT_FILE_NAME']}\n"
            f"📊 Stats: {self.stats['files_processed']} processed, {self.stats['files_skipped']} skipped, {self.stats['errors']} errors"
        )

    def scan_directory(
        self,
        current_path: str,
        file_list: Optional[List[str]],
        dir_list: Optional[List[str]]
    ):
        """Recursively scan directory for target files"""
        try:
            for item in os.listdir(current_path):
                item_path = os.path.join(current_path, item)
                
                # Skip ignored directories based on full path
                if os.path.isdir(item_path):
                    normalized_path = os.path.normpath(item_path)
                    if any(ignored_dir.lower() in normalized_path.lower() for ignored_dir in self.config['IGNORE_DIRS']):
                        self.stats['files_skipped'] += 1
                        continue

                if os.path.isdir(item_path):
                    # Check if we should scan this directory
                    if dir_list and not any(dir.lower() in item_path.lower() for dir in dir_list):
                        continue
                    # Recursively scan subdirectories
                    self.scan_directory(item_path, file_list, dir_list)
                else:
                    # Check if we should include this file
                    if self.is_target_extension(item):
                        should_include = True
                        if file_list:
                            should_include = any(f.lower() in item_path.lower() for f in file_list)
                        
                        if should_include and item not in self.config['IGNORE_FILES']:
                            self.add_file(item_path)
                            self.stats['files_processed'] += 1
                        else:
                            self.stats['files_skipped'] += 1

        except Exception as e:
            self.stats['errors'] += 1
            return f'Error processing {current_path}: {str(e)}'

    def is_target_extension(self, filename: str) -> bool:
        """Check if file has a target extension"""
        return any(filename.lower().endswith(ext.lower()) for ext in self.config['TARGET_EXTENSIONS'])

    def add_file(self, file_path: str):
        """Read a file and prepare it for export"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Convert to single line and clean up whitespace
            single_line_content = ' '.join(content.split())
            file_content = f'/* start: {file_path}*/ {single_line_content} /* end: {file_path} */'
            self.files.append(file_content)
        
        except Exception as e:
            self.stats['errors'] += 1
            return f'Error processing {file_path}: {str(e)}'

    def write_output_files(self):
        """Write the collected files to output files, splitting at MAX_CHARS"""
        if not self.files:
            return

        current_output = ""
        file_counter = 1

        for file_content in self.files:
            # Check if adding this file would exceed the limit
            if len(current_output) + len(file_content) > self.config['MAX_CHARS'] and current_output:
                # Write current content to file and start new one
                self.write_file(file_counter, current_output)
                current_output = file_content
                file_counter += 1
            else:
                current_output += file_content

        # Write any remaining content
        if current_output:
            self.write_file(file_counter, current_output)

    def write_file(self, counter: int, content: str):
        """Write content to a numbered output file"""
        filename = f"{self.config['BASE_EXPORT_FILE_NAME']}_{counter}.txt" if counter > 1 else f"{self.config['BASE_EXPORT_FILE_NAME']}.txt"
        with open(filename, "w", encoding='utf-8') as f:
            f.write(content)
        self.stats['output_files'] += 1

def create_gui():
    """Create and run the GUI for the code exporter"""
    exporter = CodeExporter()
    
    # Theme
    sg.theme('LightGrey1')
    
    # Layout
    layout = [
        [sg.Text('Code Export Tool', font=('Helvetica', 16))],
        [sg.HorizontalSeparator()],
        [
            sg.Text('Scan Path:', size=(10, 1)), 
            sg.Input(key='-PATH-', expand_x=True),
            sg.FolderBrowse()
        ],
        [
            sg.Text('Recent Paths:', size=(10, 1)),
            sg.Combo(
                exporter.config['RECENT_PATHS'], 
                key='-RECENT-', 
                enable_events=True, 
                expand_x=True,
                readonly=True
            )
        ],
        [
            sg.Text('Specific Files:', size=(10, 1)), 
            sg.Input(key='-FILES-', expand_x=True, tooltip='Comma separated list of files to include')
        ],
        [
            sg.Text('Specific Dirs:', size=(10, 1)), 
            sg.Input(key='-DIRS-', expand_x=True, tooltip='Comma separated list of directories to include')
        ],
        [
            sg.Text('Output Name:', size=(10, 1)),
            sg.Input(
                exporter.config['BASE_EXPORT_FILE_NAME'], 
                key='-OUTNAME-', 
                size=(20, 1),
                tooltip='Base name for output files'
            ),
            sg.Text('Max Chars:', size=(8, 1)),
            sg.Input(
                str(exporter.config['MAX_CHARS']), 
                key='-MAXCHARS-', 
                size=(10, 1),
                tooltip='Maximum characters per output file'
            )
        ],
        [
            sg.Text('Extensions:', size=(10, 1)),
            sg.Input(
                ', '.join(exporter.config['TARGET_EXTENSIONS']), 
                key='-EXTENSIONS-', 
                expand_x=True,
                tooltip='Comma separated list of file extensions to include'
            )
        ],
        [
            sg.Text('Ignore Dirs:', size=(10, 1)),
            sg.Input(
                ', '.join(exporter.config['IGNORE_DIRS']), 
                key='-IGNORE_DIRS-', 
                expand_x=True,
                tooltip='Comma separated list of directories to ignore'
            )
        ],
        [
            sg.Text('Ignore Files:', size=(10, 1)),
            sg.Input(
                ', '.join(exporter.config['IGNORE_FILES']), 
                key='-IGNORE_FILES-', 
                expand_x=True,
                tooltip='Comma separated list of files to ignore'
            )
        ],
        [sg.HorizontalSeparator()],
        [
            sg.Button('Export', size=(10, 1), bind_return_key=True),
            sg.Button('Cancel', size=(10, 1)),
            sg.Button('Defaults', size=(10, 1))
        ],
        [
            sg.Multiline(
                key='-OUTPUT-', 
                size=(80, 10), 
                autoscroll=True,
                disabled=True,
                expand_x=True,
                expand_y=True
            )
        ]
    ]
    
    # Window
    window = sg.Window(
        'Code Export Tool', 
        layout, 
        resizable=True,
        finalize=True
    )
    window.set_min_size((600, 500))
    
    # Event loop
    while True:
        event, values = window.read()
        
        if event in (sg.WIN_CLOSED, 'Cancel'):
            break
            
        elif event == '-RECENT-':
            window['-PATH-'].update(values['-RECENT-'])
            
        elif event == 'Defaults':
            window['-OUTNAME-'].update(DEFAULT_CONFIG['BASE_EXPORT_FILE_NAME'])
            window['-MAXCHARS-'].update(str(DEFAULT_CONFIG['MAX_CHARS']))
            window['-EXTENSIONS-'].update(', '.join(DEFAULT_CONFIG['TARGET_EXTENSIONS']))
            window['-IGNORE_DIRS-'].update(', '.join(DEFAULT_CONFIG['IGNORE_DIRS']))
            window['-IGNORE_FILES-'].update(', '.join(DEFAULT_CONFIG['IGNORE_FILES']))
            
        elif event == 'Export':
            # Update config from UI
            exporter.config['BASE_EXPORT_FILE_NAME'] = values['-OUTNAME-']
            exporter.config['MAX_CHARS'] = int(values['-MAXCHARS-'])
            exporter.config['TARGET_EXTENSIONS'] = {
                ext.strip() for ext in values['-EXTENSIONS-'].split(',')
            }
            exporter.config['IGNORE_DIRS'] = {
                dir.strip() for dir in values['-IGNORE_DIRS-'].split(',')
            }
            exporter.config['IGNORE_FILES'] = {
                file.strip() for file in values['-IGNORE_FILES-'].split(',')
            }
            
            # Run export
            window['-OUTPUT-'].update('Processing files...\n')
            window.refresh()
            
            result = exporter.generate_export(
                values['-PATH-'],
                values['-FILES-'],
                values['-DIRS-']
            )
            
            window['-OUTPUT-'].update(result + '\n', append=True)
    
    window.close()

if __name__ == '__main__':
    create_gui()