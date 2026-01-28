import os
import re
import json

def extract_from_all_actions():
    project_root = os.getcwd()
    # Adjust this if your registry is named differently or in a subfolder
    registry_path = "src/services/actions/registry.ts"
    
    if not os.path.exists(registry_path):
        print(f"❌ Registry not found at {registry_path}")
        return

    # 1. Find all imported actions in the registry
    with open(registry_path, 'r', encoding='utf-8') as f:
        registry_content = f.read()

    # Matches: import { createSomething } from './catalog/createSomething'
    # It captures the path so we can follow it
    import_pattern = re.compile(r'from\s+[\'"](.+?)[\'"]')
    imports = import_pattern.findall(registry_content)

    all_tools = []
    
    print(f"🔍 Scanning registry: {registry_path}")

    # 2. Go to each imported file and find the description
    for imp in imports:
        if not imp.startswith('.'): 
            continue # skip external node_modules
        
        # Resolve the path relative to the registry's directory
        # We strip the extension to try adding .ts or .tsx
        base_action_path = os.path.normpath(os.path.join("src/services/actions", imp))
        
        found_file = None
        for ext in ['.ts', '.tsx', '/index.ts']:
            if os.path.exists(base_action_path + ext):
                found_file = base_action_path + ext
                break
        
        if found_file:
            with open(found_file, 'r', encoding='utf-8') as f:
                action_content = f.read()
                
                # Look for the description field inside the action object
                desc_match = re.search(r'description:\s*[\'"](.+?)[\'"]', action_content)
                
                # The name is usually the file name or an exported ID
                action_name = os.path.basename(imp)
                
                if desc_match:
                    all_tools.append({
                        "name": action_name,
                        "description": desc_match.group(1),
                        "source_file": found_file
                    })
                    print(f"  ✅ Found: {action_name}")
        else:
            print(f"  ⚠️ Could not resolve: {imp}")

    # 3. Save the results
    if all_tools:
        with open('scripts/tools.json', 'w', encoding='utf-8') as f:
            json.dump(all_tools, f, indent=2)
        print(f"\n🚀 Success! Extracted {len(all_tools)} tools to tools.json")
    else:
        print("\n❌ No tools found in the sub-files. Check your regex patterns.")

if __name__ == "__main__":
    extract_from_all_actions()