/**
 * Migration script to replace old toast system with new notifications
 * Usage: node migrate-notifications.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_SRC = path.join(__dirname, 'client', 'src');

// Files to migrate
const filesToMigrate = [
  'pages/search.tsx',
  'pages/profile.tsx', 
  'pages/notifications.tsx',
  'components/comment-section.tsx',
  'components/post-card.tsx',
  'components/settings-dialog.tsx'
];

function migrateFile(filePath) {
  console.log(`Migrating ${filePath}...`);
  
  const fullPath = path.join(CLIENT_SRC, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace imports
  content = content.replace(
    /import\s+{\s*useToast\s*}\s+from\s+["']@\/hooks\/use-toast["'];?\s*\n/g,
    'import { notifications } from "@/lib/notifications";\n'
  );
  
  // Remove useToast hook usage
  content = content.replace(
    /const\s+{\s*toast\s*}\s+=\s+useToast\(\);\s*\n/g,
    ''
  );
  
  // Replace toast calls
  content = content.replace(
    /toast\(\{\s*title:\s*([^,]+),\s*description:\s*([^,\}]+),?\s*\}\);/g,
    'notifications.success($1, $2);'
  );
  
  content = content.replace(
    /toast\(\{\s*title:\s*([^,]+),\s*description:\s*([^,]+),\s*variant:\s*["']destructive["'],?\s*\}\);/g,
    'notifications.error($1, $2);'
  );
  
  // Handle more complex patterns
  content = content.replace(
    /toast\(\{[\s\S]*?variant:\s*["']destructive["'][\s\S]*?\}\);/g,
    (match) => {
      const titleMatch = match.match(/title:\s*([^,]+)/);
      const descMatch = match.match(/description:\s*([^,}]+)/);
      
      const title = titleMatch ? titleMatch[1] : '"Error"';
      const desc = descMatch ? descMatch[1] : '"An error occurred"';
      
      return `notifications.error(${title}, ${desc});`;
    }
  );
  
  fs.writeFileSync(fullPath, content);
  console.log(`  ✅ Migrated ${filePath}`);
}

// Run migration
console.log('🔄 Starting toast to notifications migration...\n');

filesToMigrate.forEach(migrateFile);

console.log('\n✨ Migration completed!');
console.log('\nNext steps:');
console.log('1. Test the application: npm run dev');
console.log('2. Remove old toast components if no longer needed');
console.log('3. Update any remaining manual toast calls');
