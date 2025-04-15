import os
import requests

# Function to get files in your project directory
def get_project_files(project_path):
    files = []
    for root, dirs, filenames in os.walk(project_path):
        for file in filenames:
            if file.endswith((".ts", ".tsx")):
                files.append(os.path.join(root, file))
    return files

# Function to query Code LLaMA for relevant files
def query_codellama_for_files(files, user_question):
    file_paths = "\n".join(files)  # Create a list of files as text
    prompt = f"""
    You are a senior developer assisting with a Next.js project. Here is the list of project files:

    {file_paths}

    Based on the above project structure, and the user's question:
    "{user_question}"

    Which files or sections of the project do you think are most relevant to answering this question? List them.
    """

    response = requests.post("http://localhost:11434/api/generate", json={
        "model": "codellama:13b",
        "prompt": prompt,
        "stream": False
    })
    
    return response.json().get("response", "")

# Function to query Code LLaMA for a detailed answer based on relevant files
def query_codellama_for_answer(relevant_files, user_question):
    relevant_code = "\n".join([f"# File: {file}\n{open(file).read()}" for file in relevant_files])
    
    prompt = f"""
    Based on the following code, answer the question:
    "{user_question}"

    Relevant project code:
    {relevant_code}
    """
    
    response = requests.post("http://localhost:11434/api/generate", json={
        "model": "codellama:13b",
        "prompt": prompt,
        "stream": False
    })
    
    return response.json().get("response", "")

# Main logic
project_path = "src/"  # Specify your project path
user_question = "How do I create a new API route in my project?"  # Your query

# Step 1: Get all project files
files = get_project_files(project_path)

# Step 2: Ask Code LLaMA to identify the most relevant files
relevant_files = query_codellama_for_files(files, user_question)

# Step 3: Get content from the relevant files
print("Relevant files:", relevant_files)
relevant_code_files = [file.strip() for file in relevant_files.split('\n') if file.strip()]

# Step 4: Query Code LLaMA for a detailed answer based on the selected files
final_answer = query_codellama_for_answer(relevant_code_files, user_question)
print("\nAI Response:", final_answer)
