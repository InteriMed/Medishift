import os
import re
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.absolute()
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
EXCLUDE_DIRS = {'.git', 'node_modules', 'dist', 'build'}

def get_project_skeleton():
    """Maps filename to its absolute path for quick lookup."""
    skeleton = {}
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            full_path = Path(root) / file
            # Store by filename for suggestions, and full path for verification
            skeleton[full_path.name] = str(full_path.resolve())
            skeleton[str(full_path.resolve())] = True
    return skeleton

def find_best_match(skeleton, import_str):
    """Tries to find where the file actually is."""
    target_file = import_str.split('/')[-1]
    possible_extensions = ['', '.ts', '.tsx', '.js', '.jsx']
    
    for ext in possible_extensions:
        lookup = f"{target_file}{ext}"
        if lookup in skeleton:
            return skeleton[lookup]
    return None

def get_relative_import(from_file, to_file):
    """Calculates the correct ../ path."""
    from_path = Path(from_file).parent
    to_path = Path(to_file)
    
    # Get relative path and ensure it starts with ./ or ../
    rel = os.path.relpath(to_path.parent, from_path)
    rel_path = os.path.join(rel, to_path.stem)
    
    if not rel_path.startswith('.'):
        rel_path = f"./{rel_path}"
    return rel_path

def analyze_and_suggest():
    print("🔍 Scanning project and building map...")
    skeleton = get_project_skeleton()
    import_regex = re.compile(r"from\s+['\"](.*?)['\"]|import\s+['\"](.*?)['\"]")
    
    for root, _, files in os.walk(ROOT_DIR):
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                file_path = Path(root) / file
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                matches = import_regex.findall(content)
                for match in matches:
                    import_str = next(s for s in match if s)
                    if import_str.startswith('.'):
                        # Simple resolution check
                        potential = (file_path.parent / import_str).resolve()
                        
                        # If file doesn't exist, suggest a fix
                        if not any(os.path.exists(f"{potential}{e}") for e in ['', '.ts', '.tsx', '.js']):
                            actual_loc = find_best_match(skeleton, import_str)
                            print(f"\n❌ BROKEN: {file_path.relative_to(ROOT_DIR)}")
                            print(f"   Current: '{import_str}'")
                            if actual_loc:
                                suggestion = get_relative_import(file_path, actual_loc)
                                print(f"   💡 SUGGESTION: '{suggestion}'")

if __name__ == "__main__":
    analyze_and_suggest()