#!/usr/bin/env node
import { Command } from 'commander';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { listModel } from './commands/listModels';
import { setModel } from './commands/setModel';
import { prompt } from './commands/prompt';

const program = new Command();

program
  .name('nive')
  .description('Nive — minimal agentic loop')
  .version('0.1.0')
  .addCommand(login)
  .addCommand(logout)
  .addCommand(listModel)
  .addCommand(setModel)
  .addCommand(prompt)


program.parse();