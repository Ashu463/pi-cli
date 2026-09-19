#!/usr/bin/env node
import { Command } from 'commander';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { listModel } from './commands/listModels';
import { setModel } from './commands/setModel';
import { prompt } from './commands/prompt';
import { tui, launchTui } from './commands/tui';

const program = new Command();

program
  .name('aeon')
  .description('AEON — your personal coding companion')
  .version('0.3.0')
  .addCommand(login)
  .addCommand(logout)
  .addCommand(listModel)
  .addCommand(setModel)
  .addCommand(prompt)
  .addCommand(tui)
  // bare `aeon` opens the TUI; subcommands stay for config and scripting.
  .action(launchTui)

program.parse();
