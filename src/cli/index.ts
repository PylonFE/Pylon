#!/usr/bin/env node
// tslint:disable-next-line:no-var-requires
const version = require('../../package.json').version;

import chalk from 'chalk';
import * as program from 'commander';
import * as process from 'process';

import { startAnalyze } from '../graph';

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
  .parse(process.argv);

let path;
if (program.path) {
  path = program.path;
} else {
  path = './';
}
const rules = program.rules && program.rules.replace(/'/g, '"');
const option = {
  dictionaryPath: path,
  genStatFile: program.genStatFile,
  statFile: program.statFile,
  rules: rules ? JSON.parse(rules) : '',
  circle: program.circle,
  lineNumberIgnorePath: program.lineNumberIgnorePath,
  fileMaxLine: program.fileMaxLine,
  tsConfigPath: program.tsConfigPath,
  isJs: program.isJs,
};
console.log(
  chalk.bgGreenBright('option is : '),
  chalk.bgGreenBright(JSON.stringify(option))
);
try {
  startAnalyze(option);
} catch (e) {
  console.error(e);
}
