#!/usr/bin/env node
// tslint:disable-next-line:no-var-requires
const version = require('../../package.json').version;

import chalk from 'chalk';
import * as path from 'path';
import * as program from 'commander';
import * as process from 'process';
import * as fs from 'fs';
import { startAnalyze } from '../graph';

const cwd = process.cwd();
program
  .version(version)
  .usage('[options] <src...>')
  .option(
    '-p, --path <path>',
    'show module dependency in web,the path is the root path of project'
  )
  .option('-g, --gen-stat-file <file>', 'gen stat file')
  .option('-f, --stat-file <file>', 'the stat file to read')
  .option('-r, --rules <rule>', 'the rule to emphasize is an [][] array json')
  .option('-c, --circle', 'whether or not any circleRef', false)
  .option(
    '-l, --line-number-ignore-path <path>',
    '统计文件行数要忽略的文件路径'
  )
  .option('-m, --file-max-line <max>', '单个文件最大行数')
  .option('-t, --ts-config-path <path>', 'tsconfig路径')
  .option('-j, --is-js', '是否是js项目', false)
  .option('-a, --config <file>', '配置文件')
  .parse(process.argv);

let dictionaryPath;
let option;
if (program.path) {
  dictionaryPath = program.path;
} else {
  dictionaryPath = './';
}

if (program.config) {
  const configFile = path.resolve(cwd, program.config);
  if (!fs.existsSync(configFile))
    throw new Error('请在指定正确的pylon.config.js路径');
  option = require(configFile);
} else {
  const rules = program.rules && program.rules.replace(/'/g, '"');
  option = {
    dictionaryPath,
    genStatFile: program.genStatFile,
    statFile: program.statFile,
    rules: rules ? JSON.parse(rules) : '',
    circle: program.circle,
    lineNumberIgnorePath: program.lineNumberIgnorePath,
    fileMaxLine: program.fileMaxLine,
    tsConfigPath: program.tsConfigPath,
    isJs: program.isJs,
  };
}

console.log(
  chalk.bold('option is : '),
  chalk.bold(JSON.stringify(option, null, 2))
);
try {
  startAnalyze(option);
} catch (e) {
  console.error(e);
}
