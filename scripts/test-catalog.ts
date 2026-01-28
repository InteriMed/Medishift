
import { ActionRegistry } from '../src/services/actions/registry';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ACTION CATALOG STRESS TEST & VALIDATOR
 * 
 * This script performs:
 * 1. Registry Integrity Check (Key matches ID)
 * 2. Structure Validation (Label, Description, Schema, Handler)
 * 3. Ghost Action Detection (Files in catalog/ not in registry)
 */

async function runTests() {
    console.log('\x1b[36m%s\x1b[0m', '--- Action Catalog Programmatic Test ---');

    const actions = Object.entries(ActionRegistry);
    const totalRegistered = actions.length;
    console.log(`Found ${totalRegistered} registered actions.\n`);

    const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
    };

    // 1. Validate Registered Actions
    console.log('Verifying registered actions...');
    for (const [key, action] of actions) {
        const issues: string[] = [];

        if (!action) {
            issues.push(`Action "${key}" is null or undefined`);
        } else {
            // Check ID parity
            if (action.id !== key) {
                issues.push(`ID mismatch: Registry key "${key}" vs action.id "${action.id}"`);
            }

            // Check required fields
            if (!action.label) issues.push('Missing label');
            if (!action.description) issues.push('Missing description');

            // Check Schema
            if (!action.schema) {
                issues.push('Missing Zod schema');
            } else if (typeof (action.schema as any).parse !== 'function') {
                issues.push('Schema is not a valid Zod type (missing .parse())');
            }

            // Check Handler
            if (!action.handler) {
                issues.push('Missing handler function');
            } else if (typeof action.handler !== 'function') {
                issues.push('Handler is not a function');
            }

            // Check Permissions
            if (!action.requiredPermission) {
                issues.push('Missing requiredPermission');
            }
        }

        if (issues.length > 0) {
            results.failed++;
            results.errors.push(`[${key}] ${issues.join(', ')}`);
        } else {
            results.passed++;
        }
    }

    if (results.passed === totalRegistered) {
        console.log('\x1b[32m%s\x1b[0m', `✅ VALIDATION SUCCESS: All ${results.passed} registered actions are healthy.`);
    } else {
        console.log('\x1b[31m%s\x1b[0m', `❌ VALIDATION FAILED: ${results.failed} actions have issues.`);
        results.errors.forEach(err => console.log(`  - ${err}`));
    }

    // 2. Scan for Unregistered Files (Ghost Actions)
    console.log('\nScanning for potentially unregistered action files...');
    const catalogDir = path.join(process.cwd(), 'src/services/actions/catalog');
    const allActionFiles: string[] = [];

    function walkDir(dir: string) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                walkDir(fullPath);
            } else if (file.endsWith('.ts') && !file.endsWith('.d.ts') && file !== 'index.ts') {
                allActionFiles.push(fullPath);
            }
        }
    }

    walkDir(catalogDir);

    const registryFile = path.join(process.cwd(), 'src/services/actions/registry.ts');
    const registryContent = fs.readFileSync(registryFile, 'utf8');

    const ghostFiles: string[] = [];
    const knownNonActions = ['types.ts', 'utils.ts', 'constants.ts', 'lockValidator.ts'];

    for (const file of allActionFiles) {
        const fileName = path.basename(file);
        if (knownNonActions.includes(fileName)) continue;

        const relativePath = path.relative(path.join(process.cwd(), 'src/services/actions'), file)
            .replace(/\\/g, '/')
            .replace('.ts', '');

        // Check if the file path is mentioned in imports
        if (!registryContent.includes(relativePath)) {
            ghostFiles.push(relativePath);
        }
    }

    if (ghostFiles.length === 0) {
        console.log('\x1b[32m%s\x1b[0m', '✅ REGISTRY COMPLETENESS: No unregistered action files found.');
    } else {
        console.log('\x1b[33m%s\x1b[0m', `⚠️  FOUND ${ghostFiles.length} GHOST FILES (Not in registry):`);
        ghostFiles.sort().forEach(f => console.log(`  - ${f}`));
    }

    console.log('\n--- End of Test ---\n');

    if (results.failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
