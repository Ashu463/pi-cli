#!/usr/bin/env bun
import { Command } from 'commander';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { listModel } from './commands/listModels';
import { setModel } from './commands/setModel';
import { prompt } from './commands/prompt';

const program = new Command();

program
  .name('pi')
  .description('Pi — minimal agentic loop')
  .version('0.1.0')
  .addCommand(login)
  .addCommand(logout)
  .addCommand(listModel)
  .addCommand(setModel)
  .addCommand(prompt)





// program
//   .command('run <prompt>')
//   .description('Run the agent with a prompt')
//   .option('-t, --tools <tools>', 'comma-separated tool names to enable', 'readFile,writeFile,shell')
//   .option('--max-iter <n>', 'max iterations', '10')
//   .action(async (_prompt, _options) => {
//     // TODO: wire up Agent, ToolRegistry, GeminiProvider
//     console.log('CLI not yet wired up');

//     // For now do it like this: 
//     // don't focus on tui, build with direct commands perspective

//     // features ~ commands: 
//     // pi login --provider "provider name" --api_key "apikey", pi logout, 
//     // should fetch all the models associated with user's added provider(during login) ~ pi list-models
//     // should select one model which user said ~ pi choose-model --modelName "model name"
//     // and start receiving request for that model along with prompt. ~ pi --prompt "prompt"

//   });

program.parse();