import os
import re

EXTENSIONS = ('.js', '.jsx', '.ts', '.tsx')

def find_actual_path(base_dir, path_parts):
    """
    Given a list of path parts (['utils', 'mockProfileData']), 
    finds the actual casing on disk by traversing step-by-step.
    """
    current_path = base_dir
    actual_parts = []
    
    for part in path_parts:
        if part == '.' or part == '..':
            current_path = os.path.normpath(os.path.join(current_path, part))
            actual_parts.append(part)
            continue
            
        if not os.path.exists(current_path):
            return None
            
        # List all items in the current directory
        try:
            items = os.listdir(current_path)
        except OSError:
            return None

        # Find the item that matches the part (case-insensitive)
        found = False
        for item in items:
            if item.lower() == part.lower():
                # If there's an exact match, use it. Otherwise, use the disk version.
                # If it's a file, we check against common JS extensions
                item_no_ext = os.path.splitext(item)[0]
                if item.lower() == part.lower() or item_no_ext.lower() == part.lower():
                    actual_parts.append(item_no_ext if '.' not in part else item)
                    current_path = os.path.join(current_path, item)
                    found = True
                    break
        
        if not found:
            return None
            
    return "/".join(actual_parts)

def fix_deep_imports():
    project_root = os.getcwd()
    # Matches: import ... from './path' or require('./path')
    import_re = re.compile(r'((?:from|require)\s*\(?\s*[\'"])(.+?)([\'"]\s*\)?)')

    print("🚀 Starting Deep Path Case Correction...")

    for root, dirs, files in os.walk(project_root):
        if 'node_modules' in root or '.git' in root:
            continue
            
        for name in files:
            if name.endswith(EXTENSIONS):
                file_path = os.path.join(root, name)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                new_lines = []
                changed = False
                
                for line in lines:
                    match = import_re.search(line)
                    if match:
                        prefix, imp_path, suffix = match.groups()
                        
                        if imp_path.startswith('.'):
                            parts = imp_path.split('/')
                            # Try to find the real path on disk
                            corrected_path = find_actual_path(root, parts)
                            
                            if corrected_path and corrected_path != imp_path:
                                print(f"📝 {name}: '{imp_path}' ➔ '{corrected_path}'")
                                line = line.replace(imp_path, corrected_path)
                                changed = True
                    
                    new_lines.append(line)

                if changed:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.writelines(new_lines)

if __name__ == "__main__":
    fix_deep_imports()
    print("\n✅ Deep scan complete. Try 'npm start' again.")