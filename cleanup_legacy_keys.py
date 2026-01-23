import os
import json
import re

# Configuration
LOCALES_DIR = 'src/locales/en'
SRC_DIR = 'src'
I18N_JS_PATH = 'src/i18n.js'

def load_ns_mapping():
    """Parses i18n.js to get the namespace mapping."""
    mapping = {}
    if not os.path.exists(I18N_JS_PATH):
        return mapping
    
    try:
        with open(I18N_JS_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract nsMapping object content
            match = re.search(r'const nsMapping = \{(.*?)\};', content, re.DOTALL)
            if match:
                obj_content = match.group(1)
                # Parse lines like: home: 'pages/home',
                lines = obj_content.split('\n')
                for line in lines:
                    line = line.strip().split('//')[0] # remove comments
                    if ':' in line:
                        ns, path = line.split(':', 1)
                        ns = ns.strip().strip("'").strip('"')
                        path = path.strip().strip(',').strip().strip("'").strip('"')
                        mapping[ns] = path
    except Exception as e:
        print(f"Error parsing i18n.js: {e}")
    return mapping

def load_all_translations(directory, ns_mapping):
    """Loads all JSON files and maps them to namespaces."""
    translations = {}
    
    # Reverse mapping: file_path -> namespace
    path_to_ns = {v: k for k, v in ns_mapping.items()}
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, directory).replace('\\', '/')
                path_key = rel_path.replace('.json', '')
                
                # Determine namespace
                ns = path_to_ns.get(path_key, path_key.replace('/', ':'))
                
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        translations[ns] = {
                            'content': json.load(f),
                            'path': full_path
                        }
                except Exception as e:
                    print(f"Error loading {full_path}: {e}")
    return translations

def get_keys_recursively(d, prefix=''):
    keys = []
    if isinstance(d, dict):
        for k, v in d.items():
            new_prefix = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.extend(get_keys_recursively(v, new_prefix))
            else:
                keys.append(new_prefix)
    return keys

def remove_key_recursively(d, key_parts):
    if not key_parts or not isinstance(d, dict):
        return d
    
    k = key_parts[0]
    if len(key_parts) == 1:
        if k in d:
            del d[k]
    else:
        if k in d:
            remove_key_recursively(d[k], key_parts[1:])
            if isinstance(d[k], dict) and not d[k]:
                del d[k]
    return d

def cleanup_legacy_keys():
    print("Loading namespace mapping from i18n.js...")
    ns_mapping = load_ns_mapping()
    
    print(f"Loading translations from {LOCALES_DIR}...")
    all_translations = load_all_translations(LOCALES_DIR, ns_mapping)
    
    # Flatten all keys
    all_defined_keys = {}
    for ns, data in all_translations.items():
        keys = get_keys_recursively(data['content'])
        for k in keys:
            full_key = f"{ns}:{k}"
            all_defined_keys[full_key] = {
                'ns': ns,
                'key': k,
                'used': False
            }

    # Regex for t('ns:key') or t('key')
    t_regex = re.compile(r"t\(['\"]([^'\"]+)['\"]")

    print(f"Scanning {SRC_DIR} for usage...")
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = t_regex.finditer(content)
                        for match in matches:
                            full_key = match.group(1)
                            
                            # Check if it's a direct match or needs 'common:' prefix
                            lookup_key = full_key
                            if ':' not in full_key:
                                lookup_key = f"common:{full_key}"
                            
                            if lookup_key in all_defined_keys:
                                all_defined_keys[lookup_key]['used'] = True
                            
                            # Also check if the namespace itself is used (e.g. for returnObjects)
                            ns_only = full_key.split(':')[0] if ':' in full_key else 'common'
                            # If a component uses t('privacy'), mark all keys in privacy as used
                            # to be safe, as they are likely accessed as objects.
                            if full_key in all_translations:
                                for k in all_defined_keys:
                                    if k.startswith(f"{full_key}:"):
                                        all_defined_keys[k]['used'] = True

                except Exception:
                    pass

    # Safety check: If a file has NO keys used, double check if the namespace is used
    # in useTranslation(['ns1', 'ns2'])
    ut_regex = re.compile(r"useTranslation\(\s*\[(.*?)\]")
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        ut_matches = ut_regex.finditer(content)
                        for match in ut_matches:
                            ns_list = [n.strip().strip("'").strip('"') for n in match.group(1).split(',')]
                            for ns in ns_list:
                                for k in all_defined_keys:
                                    if k.startswith(f"{ns}:"):
                                        all_defined_keys[k]['used'] = True
                except Exception:
                    pass

    # Identify and remove legacy keys
    legacy_count = 0
    modified_namespaces = set()
    sorted_keys = sorted(all_defined_keys.keys(), key=lambda x: x.count('.'), reverse=True)
    
    for full_key in sorted_keys:
        info = all_defined_keys[full_key]
        if not info['used']:
            ns = info['ns']
            key = info['key']
            content = all_translations[ns]['content']
            remove_key_recursively(content, key.split('.'))
            modified_namespaces.add(ns)
            legacy_count += 1

    # Save modified files
    for ns in modified_namespaces:
        path = all_translations[ns]['path']
        content = all_translations[ns]['content']
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
            print(f"Updated {path}")
        except Exception as e:
            print(f"Error saving {path}: {e}")

    print(f"\nCleanup Complete!")
    print(f"Removed {legacy_count} unused keys across {len(modified_namespaces)} files.")

if __name__ == "__main__":
    cleanup_legacy_keys()
