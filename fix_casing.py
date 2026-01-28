import os
import re
import fnmatch
from pathlib import Path

# --- CONFIGURATION ---
ROOT_DIR = Path(__file__).parent.parent.absolute()
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
# Common utility filenames to fallback to if a specific export file isn't found
FALLBACK_UTILS = ['utils', 'lib', 'classnames', 'cn'] 

def parse_gitignore():
    gitignore_path = ROOT_DIR / ".gitignore"
    patterns = {'.git', 'node_modules', 'dist', 'build', '.next'}
    if gitignore_path.exists():
        with open(gitignore_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    patterns.add(line.rstrip('/'))
    return patterns

def is_ignored(path, patterns):
    parts = Path(path).parts
    for part in parts:
        for pattern in patterns:
            if fnmatch.fnmatch(part, pattern):
                return True
    return False

def get_project_skeleton(ignore_patterns):
    print("⏳ Mapping project structure...")
    skeleton = {}
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), ignore_patterns)]
        for file in files:
            if is_ignored(file, ignore_patterns): continue
            
            full_path = Path(root) / file
            # Store filename -> absolute path
            # If duplicates exist, keep the shortest path (usually closer to root)
            if file not in skeleton or len(str(full_path)) < len(str(skeleton[file])):
                skeleton[file] = str(full_path.resolve())
            
            skeleton[str(full_path.resolve())] = True
    return skeleton

def find_best_match(skeleton, import_str):
    """Finds the absolute path based on the import name."""
    target_name = import_str.split('/')[-1]
    
    # 1. Try exact matches with extensions
    for ext in ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.scss']:
        lookup = f"{target_name}{ext}"
        if lookup in skeleton:
            return skeleton[lookup]
            
    # 2. Heuristic: If looking for 'cn', it might be in 'utils.ts'
    if target_name == 'cn':
        for util in FALLBACK_UTILS:
            for ext in ['.ts', '.js', '.tsx']:
                if f"{util}{ext}" in skeleton:
                    return skeleton[f"{util}{ext}"]
    return None

def get_relative_import(from_file, to_file):
    from_path = Path(from_file).parent
    to_path = Path(to_file)
    
    rel = os.path.relpath(to_path.parent, from_path)
    rel_path = os.path.join(rel, to_path.stem)
    
    if not rel_path.startswith('.'):
        rel_path = f"./{rel_path}"
    return rel_path.replace('\\', '/')

def verify_import_exists(base_file, relative_import):
    """Checks if the proposed relative import actually resolves to a file on disk."""
    try:
        # Resolve the absolute path from the relative string
        resolved_path = (Path(base_file).parent / relative_import).resolve()
        
        # Check direct file or extensions
        for ext in ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.scss']:
            if os.path.isfile(f"{resolved_path}{ext}"):
                return True
        
        # Check index files
        if os.path.isdir(resolved_path):
             for ext in ['.ts', '.tsx', '.js', '.jsx']:
                if os.path.isfile(resolved_path / f"index{ext}"):
                    return True
        return False
    except Exception:
        return False

def apply_fix(file_path, old_import, new_import):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        escaped_old = re.escape(old_import)
        # Match inside quotes to avoid partial replacements
        pattern = re.compile(f"(['\"]){escaped_old}(['\"])")
        
        if not pattern.search(content):
            print(f"   ⚠️ Could not safely locate string. Skipping.")
            return False
            
        new_content = pattern.sub(f"\\1{new_import}\\2", content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    except Exception as e:
        print(f"   ❌ Error writing file: {e}")
        return False

def main():
    ignore_patterns = parse_gitignore()
    skeleton = get_project_skeleton(ignore_patterns)
    import_regex = re.compile(r"(from|import|require)\s+['\"](\..*?)['\"]")
    
    files_fixed = 0
    errors_skipped = 0

    print("\n🔍 Scanning files for semantic errors...\n")

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), ignore_patterns)]
        
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                file_path = Path(root) / file
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except:
                    continue

                matches = import_regex.finditer(content)
                
                for match in matches:
                    import_str = match.group(2)
                    
                    # 1. Check if current import is valid
                    if verify_import_exists(file_path, import_str):
                        continue # It's valid, skip it.

                    # It's broken. Let's fix it.
                    print(f"---------------------------------------------------")
                    print(f"📂 FILE:   {file_path.relative_to(ROOT_DIR)}")
                    print(f"❌ BROKEN: '{import_str}'")
                    
                    actual_loc = find_best_match(skeleton, import_str)
                    
                    if actual_loc:
                        suggestion = get_relative_import(file_path, actual_loc)
                        
                        # VERIFY: Does the suggested path actually exist on disk?
                        if verify_import_exists(file_path, suggestion):
                            # SUCCESS: It exists. Auto-fix.
                            print(f"✅ VERIFIED: '{suggestion}' points to valid file.")
                            if apply_fix(file_path, import_str, suggestion):
                                print(f"   🚀 [AUTO-FIXED]")
                                files_fixed += 1
                            else:
                                errors_skipped += 1
                        else:
                            # AMBIGUOUS: Suggestion logic worked, but verification failed.
                            # This usually happens with complex index exports or verifyGLN vs verifyGln cases.
                            print(f"⚠️ SUGGESTION: '{suggestion}' (Verification Failed)")
                            user_input = input("   👉 Path seems unsure. Apply anyway? [y/n] ").lower()
                            if user_input == 'y':
                                if apply_fix(file_path, import_str, suggestion):
                                    print("   ✨ Fixed.")
                                    files_fixed += 1
                            else:
                                print("   Skipped.")
                                errors_skipped += 1
                    else:
                        print(f"🤷 NO MATCH FOUND in skeleton.")
                        errors_skipped += 1

    print(f"\n--- SESSION COMPLETE ---")
    print(f"Fixed: {files_fixed}")
    print(f"Skipped/Unresolved: {errors_skipped}")

if __name__ == "__main__":
    main()