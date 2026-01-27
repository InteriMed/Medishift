#!/usr/bin/env python3
import os
import json
import re
from pathlib import Path
from collections import defaultdict

LOCALES_DIR = Path(__file__).parent / 'public' / 'locales'
SRC_DIR = Path(__file__).parent / 'src'
LANGUAGES = ['en', 'fr', 'de', 'it']

NS_MAPPING = {
    'home': 'pages/home',
    'blog': 'pages/blog',
    'about': 'pages/about',
    'faq': 'pages/faq',
    'facilities': 'pages/facilities',
    'professionals': 'pages/professionals',
    'blogArticles': 'pages/blog',
    'contact': 'pages/contact',
    'privacy': 'legal/privacy',
    'terms': 'legal/terms',
    'common': 'common',
    'admin': 'dashboard/admin',
    'dashboard': 'dashboard/dashboard',
    'calendar': 'dashboard/calendar',
    'dashboardPersonal': 'dashboard/personalDashboard',
    'dashboardProfile': 'dashboard/profile',
    'messages': 'dashboard/messages',
    'marketplace': 'dashboard/marketplace',
    'organization': 'dashboard/organization',
    'payroll': 'dashboard/payroll',
    'contracts': 'dashboard/contracts',
    'team': 'dashboard/team',
    'dropdowns': 'dropdowns',
    'validation': 'dashboard/validation',
    'auth': 'pages/auth/auth',
    'onboarding': 'pages/onboarding/onboarding',
    'pages/faq': 'pages/faq',
    'sitemap': 'pages/sitemap',
    'support': 'support',
    'notFound': 'pages/notFound',
    'tutorial': 'config/tutorial',
    'tabs': 'tabs'
}

def get_all_source_files(directory):
    files = []
    for root, dirs, filenames in os.walk(directory):
        if any(skip in root for skip in ['node_modules', '.git', 'dist', 'build', '.next']):
            continue
        for filename in filenames:
            if filename.endswith(('.js', '.jsx', '.ts', '.tsx')):
                files.append(os.path.join(root, filename))
    return files

def extract_all_translation_keys(content):
    keys = set()
    
    patterns = [
        r"t\(['\"`]([^'\"`]+)['\"`]",
        r"t\(['\"`]([^'\"`]+)['\"`]\s*,",
        r"i18n\.t\(['\"`]([^'\"`]+)['\"`]",
        r"i18next\.t\(['\"`]([^'\"`]+)['\"`]",
        r"\.t\(['\"`]([^'\"`]+)['\"`]",
        r"getTranslation\([^,]+,\s*['\"`]([^'\"`]+)['\"`]",
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.MULTILINE)
        for match in matches:
            key = match.group(1)
            if key and not key.startswith('http') and len(key) > 0:
                if '{{' not in key and '${' not in key:
                    keys.add(key)
    
    return keys

def load_translation_file(lang, file_path):
    full_path = LOCALES_DIR / lang / file_path
    if full_path.exists():
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Error loading {full_path}: {e}")
            return None
    return None

def get_all_keys_from_translation(obj, prefix='', namespace=''):
    keys = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            full_key = f"{prefix}.{key}" if prefix else key
            full_path = f"{namespace}:{full_key}" if namespace else full_key
            
            if isinstance(value, dict):
                keys.extend(get_all_keys_from_translation(value, full_key, namespace))
            else:
                keys.append({
                    'key': full_key,
                    'full_path': full_path,
                    'namespace': namespace
                })
    return keys

def parse_translation_key(key_string):
    if ':' in key_string:
        parts = key_string.split(':', 1)
        namespace = parts[0].strip()
        key_path = parts[1].strip()
        return {'namespace': namespace, 'key': key_path}
    return {'namespace': None, 'key': key_string}

def normalize_key(key_path):
    return key_path.replace(' ', '').lower()

def is_key_used(translation_key, used_keys):
    parsed = parse_translation_key(translation_key['full_path'])
    
    if parsed['namespace']:
        namespace = parsed['namespace']
        key = parsed['key']
    else:
        namespace = translation_key['namespace']
        key = translation_key['key']
    
    normalized_key = normalize_key(key)
    normalized_full = normalize_key(translation_key['full_path'])
    
    key_parts = key.split('.')
    key_basename = key_parts[-1] if key_parts else key
    
    for used_key in used_keys:
        used_parsed = parse_translation_key(used_key)
        
        if used_parsed['namespace']:
            used_ns = used_parsed['namespace']
            used_key_path = used_parsed['key']
        else:
            used_ns = None
            used_key_path = used_key
        
        normalized_used = normalize_key(used_key_path)
        normalized_used_full = normalize_key(used_key)
        
        used_key_parts = used_key_path.split('.')
        used_key_basename = used_key_parts[-1] if used_key_parts else used_key_path
        
        if normalized_key == normalized_used or normalized_full == normalized_used_full:
            return True
        
        if namespace and used_ns:
            if namespace == used_ns:
                if normalized_key == normalized_used:
                    return True
                if key_basename == used_key_basename and len(key_parts) == len(used_key_parts):
                    return True
        
        if not namespace and not used_ns:
            if normalized_key == normalized_used:
                return True
        
        if key == used_key_path:
            return True
        
        if key.endswith('.' + used_key_path) or used_key_path.endswith('.' + key):
            return True
    
    return False

def find_unused_translations():
    print('🔍 Checking for unused (legacy) translations...\n')
    
    all_translation_keys = defaultdict(lambda: defaultdict(list))
    used_keys = set()
    
    print('📚 Loading translation files...')
    for lang in LANGUAGES:
        lang_dir = LOCALES_DIR / lang
        if not lang_dir.exists():
            continue
        
        for root, dirs, files in os.walk(lang_dir):
            for file in files:
                if file.endswith('.json'):
                    rel_path = os.path.relpath(os.path.join(root, file), lang_dir)
                    rel_path_no_ext = rel_path.replace('.json', '').replace('\\', '/')
                    
                    data = load_translation_file(lang, rel_path)
                    if data:
                        namespace = None
                        for ns, mapped_path in NS_MAPPING.items():
                            if mapped_path == rel_path_no_ext or mapped_path.replace('/', '\\') == rel_path_no_ext.replace('/', '\\'):
                                namespace = ns
                                break
                        
                        if not namespace:
                            parts = rel_path_no_ext.split('/')
                            if len(parts) > 0:
                                namespace = parts[-1]
                        
                        keys = get_all_keys_from_translation(data, '', namespace)
                        all_translation_keys[lang][namespace].extend(keys)
        
        print(f'  ✓ Loaded {lang} translations')
    
    print(f'\n🔎 Scanning source files for translation usage...')
    source_files = get_all_source_files(SRC_DIR)
    print(f'  Found {len(source_files)} source files')
    
    for file_path in source_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            keys = extract_all_translation_keys(content)
            used_keys.update(keys)
        except Exception as e:
            print(f"  Warning: Error reading {file_path}: {e}")
    
    print(f'  Found {len(used_keys)} unique translation keys in code\n')
    
    print('🔍 Identifying unused translations...')
    unused_translations = defaultdict(lambda: defaultdict(list))
    
    for lang in LANGUAGES:
        for namespace, keys in all_translation_keys[lang].items():
            for key_info in keys:
                if not is_key_used(key_info, used_keys):
                    unused_translations[lang][namespace].append(key_info)
    
    return unused_translations, used_keys

def generate_report(unused_translations, used_keys):
    print('\n' + '=' * 80)
    print('📊 UNUSED TRANSLATIONS REPORT')
    print('=' * 80 + '\n')
    
    total_unused = 0
    unused_by_lang = {}
    
    for lang in sorted(unused_translations.keys()):
        lang_total = 0
        for ns in sorted(unused_translations[lang].keys()):
            count = len(unused_translations[lang][ns])
            lang_total += count
            if lang not in unused_by_lang:
                unused_by_lang[lang] = {}
            unused_by_lang[lang][ns] = count
        total_unused += lang_total
        if lang_total > 0:
            print(f'📌 {lang.upper()}: {lang_total} unused translation keys')
    
    if total_unused == 0:
        print('✅ No unused translations found! All translation keys are being used.\n')
        return
    
    print(f'\n📈 Total unused translations: {total_unused}\n')
    
    print('📋 Breakdown by namespace:\n')
    for lang in sorted(unused_translations.keys()):
        if not unused_translations[lang]:
            continue
        
        print(f'  {lang.upper()}:')
        ns_entries = sorted(
            [(ns, len(keys)) for ns, keys in unused_translations[lang].items() if keys],
            key=lambda x: x[1],
            reverse=True
        )
        
        for ns, count in ns_entries:
            print(f'    • {ns}: {count} unused keys')
            if count <= 10:
                for key_info in unused_translations[lang][ns][:10]:
                    print(f'      - {key_info["full_path"]}')
            else:
                for key_info in unused_translations[lang][ns][:5]:
                    print(f'      - {key_info["full_path"]}')
                print(f'      ... and {count - 5} more')
        print()
    
    report_data = {
        'summary': {
            'totalUnusedKeys': total_unused,
            'totalUsedKeys': len(used_keys),
            'languages': list(unused_translations.keys())
        },
        'unusedTranslations': {
            lang: {
                ns: [
                    {
                        'key': k['key'],
                        'full_path': k['full_path'],
                        'namespace': k['namespace']
                    }
                    for k in keys
                ]
                for ns, keys in namespaces.items()
            }
            for lang, namespaces in unused_translations.items()
        },
        'usedKeys': sorted(list(used_keys))
    }
    
    report_path = Path(__file__).parent / 'unused-translations-report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    print(f'📄 Detailed report saved to: {report_path}')
    
    csv_path = Path(__file__).parent / 'unused-translations.csv'
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        f.write('Language,Namespace,Key,FullPath\n')
        for lang in sorted(unused_translations.keys()):
            for ns in sorted(unused_translations[lang].keys()):
                for key_info in unused_translations[lang][ns]:
                    f.write(f'{lang},{ns},"{key_info["key"]}","{key_info["full_path"]}"\n')
    print(f'📊 CSV report saved to: {csv_path}\n')
    
    print('=' * 80)
    print('✅ Analysis complete!')
    print('=' * 80)

def main():
    try:
        unused_translations, used_keys = find_unused_translations()
        generate_report(unused_translations, used_keys)
    except KeyboardInterrupt:
        print('\n\n⚠️  Analysis interrupted by user')
    except Exception as e:
        print(f'\n\n❌ Error during analysis: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

