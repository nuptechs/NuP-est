import fs from 'fs';
import path from 'path';

export async function validateApp(name) {
  console.log(`🔍 Validating app: ${name}`);
  
  const appDir = path.resolve(process.cwd(), name);
  
  if (!fs.existsSync(appDir)) {
    console.error(`❌ Error: App directory not found: ${appDir}`);
    process.exit(1);
  }
  
  const checks = [
    checkConfig,
    checkStructure,
    checkPackageJson,
    checkConfigs,
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = await check(appDir, name);
    if (!result.passed) {
      allPassed = false;
      console.error(`\n❌ ${result.name} failed:`);
      result.errors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log(`✅ ${result.name} passed`);
    }
  }
  
  if (allPassed) {
    console.log(`\n✅ All checks passed! App is ready to be registered.`);
    console.log(`\nTo add to monorepo:`);
    console.log(`  1. Copy to monorepo: cp -r ${name} /path/to/monorepo/apps/`);
    console.log(`  2. Register: npx nup-app register ${name}`);
  } else {
    console.log(`\n❌ Some checks failed. Please fix the issues above.`);
    process.exit(1);
  }
}

async function checkConfig(appDir) {
  const errors = [];
  const configPath = path.join(appDir, 'nup-app.config.json');
  
  if (!fs.existsSync(configPath)) {
    errors.push('Missing nup-app.config.json');
    return { name: 'Config file', passed: false, errors };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.name) errors.push('Missing required field: name');
    if (!config.port) errors.push('Missing required field: port');
    if (config.port < 1024 || config.port > 65535) {
      errors.push('Port must be between 1024 and 65535');
    }
  } catch (error) {
    errors.push(`Invalid JSON: ${error.message}`);
  }
  
  return {
    name: 'Config file',
    passed: errors.length === 0,
    errors
  };
}

async function checkStructure(appDir) {
  const errors = [];
  const requiredDirs = ['client', 'server'];
  const requiredFiles = [
    'client/src/App.tsx',
    'client/src/main.tsx',
    'client/index.html',
    'server/index.ts'
  ];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(appDir, dir))) {
      errors.push(`Missing required directory: ${dir}/`);
    }
  }
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(appDir, file))) {
      errors.push(`Missing required file: ${file}`);
    }
  }
  
  return {
    name: 'Directory structure',
    passed: errors.length === 0,
    errors
  };
}

async function checkPackageJson(appDir) {
  const errors = [];
  const packagePath = path.join(appDir, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    errors.push('Missing package.json');
    return { name: 'Package.json', passed: false, errors };
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!pkg.name) errors.push('Missing package name');
    if (!pkg.scripts?.dev) errors.push('Missing dev script');
    if (!pkg.scripts?.build) errors.push('Missing build script');
  } catch (error) {
    errors.push(`Invalid JSON: ${error.message}`);
  }
  
  return {
    name: 'Package.json',
    passed: errors.length === 0,
    errors
  };
}

async function checkConfigs(appDir) {
  const errors = [];
  const configs = [
    'vite.config.ts',
    'tailwind.config.ts',
    'tsconfig.json'
  ];
  
  for (const config of configs) {
    if (!fs.existsSync(path.join(appDir, config))) {
      errors.push(`Missing ${config}`);
    }
  }
  
  return {
    name: 'Config files',
    passed: errors.length === 0,
    errors
  };
}
