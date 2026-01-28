const fs = require('fs');
const path = require('path');

// Read the registry file
const registryPath = path.join(__dirname, '../src/services/actions/registry.ts');
const registryContent = fs.readFileSync(registryPath, 'utf-8');

// Extract import statements
const importPattern = /import\s+\{\s*(\w+)\s*\}\s+from\s+['"](.+?)['"]/g;
const imports = [];
let match;

while ((match = importPattern.exec(registryContent)) !== null) {
  const actionName = match[1];
  const importPath = match[2];
  imports.push({ actionName, importPath });
}

console.log(`🔍 Found ${imports.length} imports in registry.ts`);

// Process each import to extract metadata
const tools = [];

for (const { actionName, importPath } of imports) {
  // Convert relative import to file path
  const filePath = importPath.replace(/^\.\//, '').replace(/^\.\.\//, '') + '.ts';
  const fullPath = path.join(__dirname, '../src/services/actions', filePath);
  
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Extract description
      const descMatch = content.match(/description:\s*['"](.+?)['"]/);
      const labelMatch = content.match(/label:\s*['"](.+?)['"]/);
      const idMatch = content.match(/id:\s*['"](.+?)['"]/);
      
      if (descMatch) {
        tools.push({
          name: actionName.replace(/Action$/, ''),
          id: idMatch ? idMatch[1] : null,
          label: labelMatch ? labelMatch[1] : null,
          description: descMatch[1],
          source_file: `src/services/actions/${filePath}`
        });
        console.log(`  ✅ ${actionName}`);
      } else {
        console.log(`  ⚠️  ${actionName} - No description found`);
      }
    } else {
      console.log(`  ❌ ${actionName} - File not found: ${fullPath}`);
    }
  } catch (error) {
    console.log(`  ❌ ${actionName} - Error: ${error.message}`);
  }
}

// Sort by category (based on ID prefix)
tools.sort((a, b) => {
  const aCategory = a.id ? a.id.split('.')[0] : 'zzz';
  const bCategory = b.id ? b.id.split('.')[0] : 'zzz';
  if (aCategory !== bCategory) {
    return aCategory.localeCompare(bCategory);
  }
  return (a.id || '').localeCompare(b.id || '');
});

// Write to tools.json
const outputPath = path.join(__dirname, 'tools.json');
fs.writeFileSync(outputPath, JSON.stringify(tools, null, 2), 'utf-8');

console.log(`\n🚀 Success! Generated ${tools.length} tools in scripts/tools.json`);
console.log(`\n📊 Actions by Category:`);

// Count by category
const categories = {};
tools.forEach(tool => {
  if (tool.id) {
    const category = tool.id.split('.')[0];
    categories[category] = (categories[category] || 0) + 1;
  }
});

Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat.padEnd(20)} ${count}`);
});

