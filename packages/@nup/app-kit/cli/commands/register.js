import fs from 'fs';
import path from 'path';

export async function registerApp(name, options) {
  console.log(`📝 Registering app: ${name}`);
  
  // Find app directory
  const appDir = path.resolve(process.cwd(), 'apps', name);
  
  if (!fs.existsSync(appDir)) {
    console.error(`❌ Error: App directory not found at ${appDir}`);
    console.log(`\nDid you copy the app to apps/ directory?`);
    process.exit(1);
  }
  
  // Load app config
  const configPath = path.join(appDir, 'nup-app.config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: nup-app.config.json not found`);
    console.log(`\nMake sure your app has a nup-app.config.json file`);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Validate if requested
  if (!options.skipValidation) {
    console.log('🔍 Validating app...');
    const validation = await validateAppConfig(config, appDir);
    if (!validation.valid) {
      console.error(`❌ Validation failed:`);
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    console.log('✅ Validation passed');
  }
  
  // Update pnpm-workspace.yaml
  console.log('📦 Updating pnpm-workspace.yaml...');
  updateWorkspaceConfig(name);
  
  // Update turbo.json
  console.log('⚡ Updating turbo.json...');
  updateTurboConfig(name);
  
  // Create .env file if needed
  if (config.env?.required?.length > 0) {
    console.log('🔐 Creating .env file...');
    createEnvFile(appDir, config);
  }
  
  console.log(`\n✅ App registered successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  pnpm install --filter ${name}...`);
  console.log(`  pnpm turbo run dev --filter ${name}`);
}

async function validateAppConfig(config, appDir) {
  const errors = [];
  
  // Check required fields
  if (!config.name) errors.push('Missing required field: name');
  if (!config.port) errors.push('Missing required field: port');
  
  // Check directory structure
  const requiredDirs = ['client', 'server'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(appDir, dir))) {
      errors.push(`Missing required directory: ${dir}`);
    }
  }
  
  // Check package.json
  if (!fs.existsSync(path.join(appDir, 'package.json'))) {
    errors.push('Missing package.json');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function updateWorkspaceConfig(appName) {
  const workspacePath = path.resolve(process.cwd(), 'pnpm-workspace.yaml');
  
  if (!fs.existsSync(workspacePath)) {
    console.warn('⚠️  pnpm-workspace.yaml not found, skipping...');
    return;
  }
  
  let content = fs.readFileSync(workspacePath, 'utf8');
  const appEntry = `  - "apps/${appName}"`;
  
  if (!content.includes(appEntry)) {
    // Add to packages list
    if (content.includes('packages:')) {
      content = content.replace(
        /packages:\s*/,
        `packages:\n${appEntry}\n`
      );
      fs.writeFileSync(workspacePath, content);
      console.log(`  ✓ Added ${appName} to workspace`);
    }
  } else {
    console.log(`  ℹ Already in workspace`);
  }
}

function updateTurboConfig(appName) {
  const turboPath = path.resolve(process.cwd(), 'turbo.json');
  
  if (!fs.existsSync(turboPath)) {
    console.warn('⚠️  turbo.json not found, skipping...');
    return;
  }
  
  const turboConfig = JSON.parse(fs.readFileSync(turboPath, 'utf8'));
  
  // Turbo typically works with workspace packages automatically
  console.log(`  ✓ Turbo will auto-detect ${appName}`);
}

function createEnvFile(appDir, config) {
  const envPath = path.join(appDir, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('  ℹ .env already exists, skipping...');
    return;
  }
  
  let envContent = '# Environment variables\n\n';
  
  if (config.env.required) {
    envContent += '# Required\n';
    config.env.required.forEach(key => {
      envContent += `${key}=\n`;
    });
  }
  
  if (config.env.optional) {
    envContent += '\n# Optional\n';
    config.env.optional.forEach(key => {
      envContent += `# ${key}=\n`;
    });
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`  ✓ Created .env file`);
}
