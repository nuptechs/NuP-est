import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(name, options) {
  console.log(`🚀 Creating new NuP app: ${name}`);
  
  const targetDir = path.resolve(process.cwd(), name);
  
  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory ${name} already exists`);
    process.exit(1);
  }
  
  // Create directory
  fs.mkdirSync(targetDir, { recursive: true });
  
  // Copy template
  const templateDir = path.resolve(__dirname, '../../templates/standalone-app');
  
  if (!fs.existsSync(templateDir)) {
    console.error('❌ Error: Template not found. Please report this issue.');
    process.exit(1);
  }
  
  // Copy all files recursively
  copyDirectory(templateDir, targetDir);
  
  // Update package.json with app name
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = name;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
  
  // Update nup-app.config.json
  const configPath = path.join(targetDir, 'nup-app.config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.name = name.replace(/^nup-/, '');
    config.displayName = formatDisplayName(name);
    config.port = parseInt(options.port);
    if (options.database) {
      config.database = {
        schema: name.replace(/-/g, '_'),
        required: true
      };
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  
  console.log(`\n✅ App created successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${name}`);
  console.log(`  npm install`);
  console.log(`  npm run dev`);
  console.log(`\nWhen ready to add to monorepo:`);
  console.log(`  npx nup-app register ${name}`);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function formatDisplayName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}
