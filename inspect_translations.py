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
    'dropdowns': 'dropdowns',
    'validation': 'validation',
    'auth': 'auth',
    'pages/faq': 'pages/faq',
    'sitemap': 'pages/sitemap'
}

def get_all_files(directory):
    files = []
    for root, dirs, filenames in os.walk(directory):
        if 'node_modules' in root or '.git' in root:
            continue
        for filename in filenames:
            if filename.endswith(('.js', '.jsx')):
                files.append(os.path.join(root, filename))
    return files

def extract_translation_keys(content):
    keys = set()
    
    patterns = [
        r"t\(['\"`]([^'\"`]+)['\"`]",
        r"t\(['\"`]([^'\"`]+)['\"`]\s*,\s*['\"`]",
        r"i18n\.t\(['\"`]([^'\"`]+)['\"`]",
        r"i18next\.t\(['\"`]([^'\"`]+)['\"`]",
        r"\.t\(['\"`]([^'\"`]+)['\"`]",
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            key = match.group(1)
            if key and '{{' not in key and '${' not in key and not key.startswith('http') and len(key) > 0:
                keys.add(key)
    
    return keys

def load_locale_file(lang, namespace):
    file_path = LOCALES_DIR / lang / f"{namespace}.json"
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Error loading {file_path}: {e}")
            return None
    return None

def get_all_keys_from_object(obj, prefix=''):
    keys = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict) and not isinstance(value, list):
                keys.extend(get_all_keys_from_object(value, full_key))
            else:
                keys.append(full_key)
    return keys

def get_nested_value(obj, key_path):
    keys = key_path.split('.')
    value = obj
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return None
    return value

def parse_translation_key(key):
    if ':' in key:
        colon_index = key.index(':')
        namespace = key[:colon_index].strip()
        key_path = key[colon_index + 1:].strip()
        return {'namespace': namespace, 'key': key_path}
    return {'namespace': 'common', 'key': key}

def find_hardcoded_strings(content):
    hardcoded = []
    lines = content.split('\n')
    
    suspicious_keywords = [
        'title', 'label', 'placeholder', 'text', 'message', 'error', 'success',
        'warning', 'info', 'description', 'button', 'submit', 'cancel', 'save',
        'delete', 'edit', 'add', 'remove', 'close', 'open', 'confirm', 'reject',
        'approve', 'decline', 'accept', 'logout', 'login', 'register', 'forgot',
        'reset', 'change', 'profile', 'settings', 'help', 'support', 'contact',
        'about', 'terms', 'privacy', 'language', 'theme', 'notifications', 'messages',
        'dashboard', 'home', 'back', 'next', 'continue', 'finish', 'required',
        'optional', 'select', 'search', 'filter', 'sort', 'show', 'hide', 'view',
        'preview', 'download', 'upload', 'expand', 'collapse', 'enable', 'disable',
        'activate', 'deactivate'
    ]
    
    for line_num, line in enumerate(lines, 1):
        if line.strip().startswith('//') or line.strip().startswith('*'):
            continue
        
        for keyword in suspicious_keywords:
            pattern = rf"{keyword}\s*[:=]\s*['\"`]([A-Z][^'\"`]{{3,}})['\"`]"
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                text = match.group(1)
                if (text and 
                    'http' not in text and 
                    'className' not in text and 
                    'id=' not in text and
                    'src=' not in text and
                    len(text) > 3 and
                    '{{' not in text and
                    '${' not in text):
                    hardcoded.append({
                        'line': line_num,
                        'text': text[:100],
                        'context': line.strip()[:150]
                    })
    
    return hardcoded

def main():
    print('🔍 Starting translation inspection...\n')
    
    all_locale_keys = {}
    used_keys = set()
    missing_keys = defaultdict(lambda: defaultdict(list))
    legacy_keys = defaultdict(lambda: defaultdict(list))
    hardcoded_strings = {}
    
    print('📚 Loading locale files...')
    for lang in LANGUAGES:
        all_locale_keys[lang] = {}
        for ns, file_path in NS_MAPPING.items():
            data = load_locale_file(lang, file_path)
            if data:
                all_locale_keys[lang][ns] = data
        
        common_file = load_locale_file(lang, 'common')
        if common_file:
            all_locale_keys[lang]['common'] = common_file
    
    print('🔎 Scanning source files for translation keys...')
    source_files = get_all_files(SRC_DIR)
    print(f'Found {len(source_files)} source files\n')
    
    for file_path in source_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            keys = extract_translation_keys(content)
            used_keys.update(keys)
            
            hardcoded = find_hardcoded_strings(content)
            if hardcoded:
                rel_path = os.path.relpath(file_path, SRC_DIR)
                hardcoded_strings[rel_path] = hardcoded
        except Exception as e:
            print(f"Warning: Error reading {file_path}: {e}")
    
    print(f'Found {len(used_keys)} unique translation keys in code\n')
    
    print('🔍 Checking for missing keys...')
    for used_key in used_keys:
        parsed = parse_translation_key(used_key)
        namespace = parsed['namespace']
        key = parsed['key']
        mapped_path = NS_MAPPING.get(namespace, namespace)
        
        for lang in LANGUAGES:
            locale_data = all_locale_keys[lang].get(namespace)
            
            if not locale_data:
                file_path = LOCALES_DIR / lang / f"{mapped_path}.json"
                if file_path.exists():
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            locale_data = json.load(f)
                        all_locale_keys[lang][namespace] = locale_data
                    except Exception as e:
                        pass
            
            if not locale_data:
                missing_keys[lang][namespace].append(key)
            else:
                value = get_nested_value(locale_data, key)
                if value is None:
                    missing_keys[lang][namespace].append(key)
    
    print('🔍 Checking for legacy keys...')
    for lang in LANGUAGES:
        for namespace, locale_data in all_locale_keys[lang].items():
            all_keys_in_file = get_all_keys_from_object(locale_data)
            
            for full_key in all_keys_in_file:
                found = False
                for used_key in used_keys:
                    parsed = parse_translation_key(used_key)
                    if parsed['namespace'] == namespace and parsed['key'] == full_key:
                        found = True
                        break
                
                if not found:
                    legacy_keys[lang][namespace].append(full_key)
    
    print('\n' + '=' * 80)
    print('📊 INSPECTION RESULTS')
    print('=' * 80 + '\n')
    
    print('❌ MISSING KEYS:\n')
    has_missing = False
    missing_by_lang = {}
    for lang in sorted(missing_keys.keys()):
        lang_total = 0
        for ns in sorted(missing_keys[lang].keys()):
            if missing_keys[lang][ns]:
                has_missing = True
                lang_total += len(missing_keys[lang][ns])
                if lang not in missing_by_lang:
                    missing_by_lang[lang] = {}
                missing_by_lang[lang][ns] = len(missing_keys[lang][ns])
        if lang_total > 0:
            print(f'  {lang}: {lang_total} missing keys')
    
    if has_missing:
        print('\n  Breakdown by namespace (showing top 10 per language):')
        for lang in sorted(missing_keys.keys()):
            ns_entries = sorted(
                [(ns, len(keys)) for ns, keys in missing_keys[lang].items() if keys],
                key=lambda x: x[1],
                reverse=True
            )[:10]
            if ns_entries:
                print(f'\n    {lang}:')
                for ns, count in ns_entries:
                    print(f'      {ns}: {count} missing keys')
        print('\n  (Full list available in translation-missing-keys.csv)\n')
    else:
        print('  ✅ No missing keys found!\n')
    
    print('🗑️  LEGACY KEYS (not used in code):\n')
    has_legacy = False
    legacy_by_lang = {}
    for lang in sorted(legacy_keys.keys()):
        lang_total = 0
        for ns in sorted(legacy_keys[lang].keys()):
            if legacy_keys[lang][ns]:
                has_legacy = True
                lang_total += len(legacy_keys[lang][ns])
                if lang not in legacy_by_lang:
                    legacy_by_lang[lang] = {}
                legacy_by_lang[lang][ns] = len(legacy_keys[lang][ns])
        if lang_total > 0:
            print(f'  {lang}: {lang_total} legacy keys')
    
    if has_legacy:
        print('\n  Top namespaces with legacy keys:')
        for lang in sorted(legacy_keys.keys()):
            ns_entries = sorted(
                [(ns, len(keys)) for ns, keys in legacy_keys[lang].items() if keys],
                key=lambda x: x[1],
                reverse=True
            )[:5]
            if ns_entries:
                print(f'\n    {lang}:')
                for ns, count in ns_entries:
                    print(f'      {ns}: {count} legacy keys')
        print('\n  (Full list available in translation-inspection-report.json)\n')
    else:
        print('  ✅ No legacy keys found!\n')
    
    print('⚠️  POTENTIALLY HARDCODED STRINGS:\n')
    hardcoded_files = sorted(hardcoded_strings.keys())
    if hardcoded_files:
        total_hardcoded = sum(len(items) for items in hardcoded_strings.values())
        print(f'  Found {total_hardcoded} potential hardcoded strings across {len(hardcoded_files)} files\n')
        print('  Top 20 files with most hardcoded strings:')
        sorted_files = sorted(
            [(file, len(hardcoded_strings[file])) for file in hardcoded_files],
            key=lambda x: x[1],
            reverse=True
        )[:20]
        
        for file, count in sorted_files:
            print(f'    {file}: {count} occurrences')
            for item in hardcoded_strings[file][:3]:
                text_preview = item['text'][:60] + ('...' if len(item['text']) > 60 else '')
                print(f'      Line {item["line"]}: "{text_preview}"')
            if len(hardcoded_strings[file]) > 3:
                print(f'      ... and {len(hardcoded_strings[file]) - 3} more')
            print()
        if len(hardcoded_files) > 20:
            print(f'  ... and {len(hardcoded_files) - 20} more files with hardcoded strings\n')
    else:
        print('  ✅ No hardcoded strings detected!\n')
    
    print('=' * 80)
    print('✅ Inspection complete!')
    print('=' * 80)
    
    missing_count = sum(len(keys) for lang in missing_keys.values() for keys in lang.values())
    legacy_count = sum(len(keys) for lang in legacy_keys.values() for keys in lang.values())
    
    print('\n📈 SUMMARY:')
    print(f'  Total translation keys used: {len(used_keys)}')
    print(f'  Missing keys: {missing_count}')
    print(f'  Legacy keys: {legacy_count}')
    print(f'  Files with hardcoded strings: {len(hardcoded_files)}')
    
    import json
    from datetime import datetime
    
    report_data = {
        'summary': {
            'totalUsedKeys': len(used_keys),
            'missingKeysCount': missing_count,
            'legacyKeysCount': legacy_count,
            'hardcodedFilesCount': len(hardcoded_files)
        },
        'missingKeys': {lang: {ns: keys for ns, keys in data.items()} 
                       for lang, data in missing_keys.items()},
        'legacyKeys': {lang: {ns: keys for ns, keys in data.items()} 
                      for lang, data in legacy_keys.items()},
        'hardcodedStrings': hardcoded_strings,
        'usedKeys': sorted(list(used_keys)),
        'timestamp': datetime.now().isoformat()
    }
    
    report_path = Path(__file__).parent / 'translation-inspection-report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    print(f'\n📄 Detailed report saved to: {report_path}')
    
    csv_report_path = Path(__file__).parent / 'translation-missing-keys.csv'
    with open(csv_report_path, 'w', encoding='utf-8', newline='') as f:
        f.write('Language,Namespace,Key\n')
        for lang in sorted(missing_keys.keys()):
            for ns in sorted(missing_keys[lang].keys()):
                for key in missing_keys[lang][ns]:
                    f.write(f'{lang},{ns},{key}\n')
    print(f'📊 Missing keys CSV saved to: {csv_report_path}')

if __name__ == '__main__':
    main()

