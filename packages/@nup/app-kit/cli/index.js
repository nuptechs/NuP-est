#!/usr/bin/env node

import { Command } from 'commander';
import { createApp } from './commands/create.js';
import { registerApp } from './commands/register.js';
import { validateApp } from './commands/validate.js';

const program = new Command();

program
  .name('nup-app')
  .description('CLI for creating and managing NuP apps')
  .version('1.0.0');

program
  .command('create <name>')
  .description('Create a new NuP app from template')
  .option('-p, --port <port>', 'Port number for the app', '5000')
  .option('-d, --database', 'Include database setup', false)
  .action(createApp);

program
  .command('register <name>')
  .description('Register an app in the monorepo')
  .option('--skip-validation', 'Skip validation checks', false)
  .action(registerApp);

program
  .command('validate <name>')
  .description('Validate an app before registering')
  .action(validateApp);

program.parse();
