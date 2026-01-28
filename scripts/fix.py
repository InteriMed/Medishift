import os
from pathlib import Path

PROJECT_ROOT = Path("/root/Interimed/NEW INTERIMED MERGED").resolve()
SRC_DIR = PROJECT_ROOT / "src"

def fix_types_imports():
    # Looking for where ActionContext and ActionDefinition live
    # Based on your logs, it's likely src/services/actions/types.ts
    target_file = SRC_DIR / "services" / "actions" / "types.ts"
    
    if not target_file.exists():
        print("⚠️ Could not find src/services/actions/types.ts. Please verify the path.")
        return

    for root, _, files in os.walk(SRC_DIR / "services" / "actions" / "catalog"):
        for file in files:
            if file.endswith(".ts"):
                path = Path(root) / file
                with open(path, 'r') as f:
                    content = f.read()
                
                # If it's missing the import for ActionContext
                if "ActionContext" in content and "import" not in content.split('ActionContext')[0]:
                    rel_path = os.path.relpath(target_file.parent, path.parent)
                    import_line = f"import {{ ActionDefinition, ActionContext }} from '{rel_path}/types';\n"
                    with open(path, 'w') as f:
                        f.write(import_line + content)
                    print(f"✅ Injected missing types into {file}")

if __name__ == "__main__":
    fix_types_imports()