import os
import requests

def get_project_files(project_path):
    # Define folders and files to ignore
    IGNORE_FOLDERS = {
        '.git', '__pycache__', 'node_modules', 'venv', '.venv',
        'dist', 'build', '.next', 'out', '.ai-assistant', '.vscode',
        'public', 'scripts', 'ui', '__tests__', '__mocks__', 'coverage'
    }
    
    IGNORE_FILES = {
        '*.spec.ts', '*.test.ts', '*.d.ts', '*.stories.tsx'
    }
    
    files = []
    for root, dirs, filenames in os.walk(project_path):
        # Remove ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        
        for file in filenames:
            # Skip non-TS files and ignored patterns
            if (not file.endswith((".ts", ".tsx")) or any(file.endswith(ignored) for ignored in IGNORE_FILES)):
                continue
                
            files.append(os.path.join(root, file))
    return files

def parse_relevant_files(response_text):
    """Clean up the AI response to extract just filenames"""
    files = []
    for line in response_text.split('\n'):
        line = line.strip()
        # Remove numbering and bullet points
        if line.startswith(('1. ', '2. ', '3. ', '- ')):
            line = line[2:].strip()
        # Remove any trailing descriptions
        line = line.split(' - ')[0].split(' (')[0]
        if line and os.path.exists(line):
            files.append(line)
    return files

def query_codellama_for_files(files, user_question):
    file_paths = "\n".join(files)
    prompt = f"""
    You are a senior developer assisting with a Next.js project. Here is the list of project files:

    {file_paths}

    Based on the above project structure and the user's question:
    "{user_question}"

    Which files are most relevant to answering this question? List only the full file paths.
    """

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "codellama:13b",
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json().get("response", "")

def query_codellama_for_answer(relevant_files, user_question):
    relevant_code = []
    for file in relevant_files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                relevant_code.append(f"# File: {file}\n{f.read()}")
        except Exception as e:
            print(f"Warning: Could not read {file} - {str(e)}")
            continue
    
    prompt = f"""
    Based on the following code, answer the question:
    "{user_question}"

    Relevant project code:
    {"\n".join(relevant_code)}
    """
    
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "codellama:13b",
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json().get("response", "")

def main():
    project_path = "."  # Specify your project path
    user_question = "What do i need to do to clean up my project files?"  # Your query

    # Step 1: Get all project files
    files = get_project_files(project_path)
    print(f"Found {len(files)} project files")

    # Step 2: Ask Code LLaMA to identify the most relevant files
    relevant_files_response = query_codellama_for_files(files, user_question)
    print("\nAI suggested files:\n", relevant_files_response)

    # Step 3: Parse the response to get clean file paths
    relevant_files = parse_relevant_files(relevant_files_response)
    print("\nParsed relevant files:", relevant_files)

    # Step 4: Query Code LLaMA for a detailed answer
    if relevant_files:
        final_answer = query_codellama_for_answer(relevant_files, user_question)
        print("\nAI Response:", final_answer)
    else:
        print("No valid relevant files found to answer the question")

if __name__ == "__main__":
    main()