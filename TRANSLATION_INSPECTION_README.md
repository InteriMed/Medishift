# Translation Inspection Scripts

Two scripts are available to inspect your locale files and find missing translations, legacy keys, and hardcoded strings:

1. **inspect-translations.js** (Node.js)
2. **inspect_translations.py** (Python 3)

## Quick Start

### Using Node.js:
```bash
node inspect-translations.js
```

### Using Python:
```bash
python3 inspect_translations.py
```

## What the Scripts Do

### 1. Missing Keys Detection
Scans all source files (`.js`, `.jsx`) for translation keys used in code (via `t()`, `i18n.t()`, etc.) and checks if they exist in all language files (`en`, `fr`, `de`, `it`).

### 2. Legacy Keys Detection
Finds translation keys that exist in locale files but are no longer used in the codebase.

### 3. Hardcoded Strings Detection
Attempts to identify potentially hardcoded user-facing strings that should be translated.

## Output

The scripts will output:
- **Missing Keys**: Translation keys used in code but missing from one or more language files
- **Legacy Keys**: Keys in locale files that are not referenced in code
- **Hardcoded Strings**: Potential hardcoded text that should use translations
- **Summary**: Total counts of each category

### Generated Reports

After running, the scripts generate two files:

1. **`translation-inspection-report.json`**: Complete detailed report with all data
   - All missing keys organized by language and namespace
   - All legacy keys organized by language and namespace
   - All hardcoded strings with file locations and line numbers
   - Full list of used translation keys
   - Timestamp of the inspection

2. **`translation-missing-keys.csv`**: CSV file for easy analysis in Excel/Sheets
   - Columns: Language, Namespace, Key
   - Can be filtered and sorted to prioritize fixes
   - Useful for creating translation tasks

## Example Output

```
🔍 Starting translation inspection...

📚 Loading locale files...
🔎 Scanning source files for translation keys...
Found 350 source files

Found 1234 unique translation keys in code

🔍 Checking for missing keys...
🔍 Checking for legacy keys...

================================================================================
📊 INSPECTION RESULTS
================================================================================

❌ MISSING KEYS:

  fr/common:
    - dashboard.calendar.today
    - dashboard.marketplace.applyNow
    ...

🗑️  LEGACY KEYS (not used in code):

  en/common: 15 keys
    - oldFeature.title
    - oldFeature.description
    ...

⚠️  POTENTIALLY HARDCODED STRINGS:

  dashboard/pages/admin/AdminDashboard.js:
    Line 64: "Active Shifts"
      Context: title: "Active Shifts",
    ...

================================================================================
✅ Inspection complete!
================================================================================

📈 SUMMARY:
  Total translation keys used: 1234
  Missing keys: 156
  Legacy keys: 45
  Files with hardcoded strings: 23
```

## Notes

- The scripts scan the `src/` directory for source files
- Locale files are expected in `public/locales/{lang}/`
- Namespace mappings are defined in the scripts (matching `src/i18n.js`)
- Hardcoded string detection uses heuristics and may have false positives

## Next Steps

After running the inspection:

1. **Fix Missing Keys**: 
   - Open `translation-missing-keys.csv` in Excel/Sheets
   - Filter by language to see what needs translation
   - Prioritize by namespace (e.g., fix `common` first as it's used everywhere)
   - Add missing translations to the appropriate locale files

2. **Review Legacy Keys**: 
   - Check `translation-inspection-report.json` for legacy keys
   - Remove unused translation keys to reduce maintenance burden
   - Verify keys are truly unused before deleting

3. **Replace Hardcoded Strings**: 
   - Review the hardcoded strings report
   - Replace with translation keys using `t('namespace:key')`
   - Add new translation keys to all language files

## Tips for Large Projects

With **3630 missing keys** and **9175 legacy keys**, here's a recommended approach:

1. **Start with `common` namespace**: These are used everywhere and will have the biggest impact
2. **Focus on one language at a time**: Complete French, then German, then Italian
3. **Use the CSV file**: Import into a spreadsheet, add a "Status" column, and track progress
4. **Batch similar keys**: Group related translations together for efficiency
5. **Remove legacy keys gradually**: Don't delete everything at once - verify they're unused first

