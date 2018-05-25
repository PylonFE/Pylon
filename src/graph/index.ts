import * as path from 'path';
import { analyze, Tree, Option, analyzeCirle } from '../analyzer';
import * as pify from 'pify';
const walk = require('walkdir');
const exec = pify(require('child_process').exec);
const opener = require('opener');
const express = require('express');
const http = require('http');
import chalk from 'chalk';
import * as fs from 'fs';
import * as ejs from 'ejs';
import * as koa from 'koa';
import * as ts from 'typescript';
import * as _ from 'lodash';
import { getTreeDataWithDictionary } from '../util';

export interface Node {
  name: string;
  children: Node[];
  size?: string | number;
  totalLineNumber?: string | number;
}

function findAllWithPredictInArray(arr, predict: (element: any) => boolean) {
  if (!Array.isArray(arr)) {
    return null;
  }
  const res = [];
  for (let index = 0; index < arr.length; index++) {
    const element = arr[index];
    if (predict(element)) {
      res.push(element);
    }
  }
  return res;
}
/**
 * 解析特定正则的路径
 * @param tree 保存所有指向的树
 * @param pathRegExpArray 二维数组，存储想要筛选出的路径指向
 */
export function calcMatchedPaths(
  tree: Tree,
  pathRegExpArray: string[][] | RegExp[][]
): Tree {
  const treeWithRule: Tree = {};
  let allSourceFiles = Object.keys(tree);
  for (let index = 0; index < pathRegExpArray.length; index++) {
    const pathRegExp = pathRegExpArray[index];
    let sourceRegExp = pathRegExp[0] as RegExp;
    let targetRegExp = pathRegExp[1] as RegExp;
    if (typeof sourceRegExp === 'string') {
      sourceRegExp = new RegExp(sourceRegExp);
    }
    if (typeof targetRegExp === 'string') {
      targetRegExp = new RegExp(targetRegExp);
    }
    const allMatchedSourceFile = findAllWithPredictInArray(
      allSourceFiles,
      souceFileName => {
        return sourceRegExp.test(souceFileName);
      }
    );
    for (let index = 0; index < allMatchedSourceFile.length; index++) {
      const matchedSourceFile = allMatchedSourceFile[index];
      const targetFilesNamesWithMatchedSourceFile =
        tree[matchedSourceFile].denpendencesFileName;
      const targetMatchedFilesNamesWithMatchedSourceFiles = findAllWithPredictInArray(
        targetFilesNamesWithMatchedSourceFile,
        targetFileName => {
          return targetRegExp.test(targetFileName);
        }
      );
      if (
        targetMatchedFilesNamesWithMatchedSourceFiles &&
        targetMatchedFilesNamesWithMatchedSourceFiles.length
      ) {
        if (
          treeWithRule[matchedSourceFile] &&
          treeWithRule[matchedSourceFile].denpendencesFileName
        ) {
          // 如果已经有了指向的依赖
          const temp = treeWithRule[matchedSourceFile].denpendencesFileName;
          treeWithRule[matchedSourceFile].denpendencesFileName = temp.concat(
            targetMatchedFilesNamesWithMatchedSourceFiles
          );
          _.uniq(treeWithRule[matchedSourceFile].denpendencesFileName);
        } else {
          treeWithRule[matchedSourceFile] = {
            denpendencesFileName: targetMatchedFilesNamesWithMatchedSourceFiles,
          };
        }
      }
    }
  }
  return treeWithRule;
}
interface userOpton extends Option {
  genStatFile?: string;
  statFile?: string;
  rules?: string[][] | RegExp[][];
  circle?: boolean;
  lineNumberIgnorePath?: string;
  fileMaxLine?: number;
  tsConfigPath?: string;
}
export async function startAnalyze(option: userOpton) {
  const saved = {} as Node;
  if (!path.isAbsolute(option.dictionaryPath)) {
    option.dictionaryPath = path.resolve(option.dictionaryPath);
  }

  console.log('option.dictionaryPath', option.dictionaryPath);
  let tree;
  if (option.statFile) {
    tree = JSON.parse(fs.readFileSync(option.statFile).toString());
  } else {
    try{
      tree = await analyze(Object.assign(option,{tsconfigPath:option.tsConfigPath}));
    }catch(e){
      console.error(e)
    }
  }

  try{
  await getTreeDataWithDictionary(option.dictionaryPath, saved);
  }catch(e){
    console.error(e)
  }
  if (option.genStatFile) {
    fs.writeFileSync(option.genStatFile, JSON.stringify(tree));
  }
  let treeWithRule;
  if (option.rules) {
    // 不管tree是哪里得到的
    try{
      treeWithRule = calcMatchedPaths(tree, option.rules);
    }catch(e){
      console.error(e)
    }
    console.log(
      chalk.bold(`分析关系 ${option.rules} `),
      chalk.blueBright(JSON.stringify(treeWithRule))
    );
  }
  let circle;
  if (option.circle) {
    circle = analyzeCirle(tree);
    console.log(
      chalk.bold('循环引用路径二维数组存储： '),
      chalk.redBright(JSON.stringify(circle))
    );
  }

  startServer(
    null,
    tree,
    saved.children[0],
    treeWithRule,
    path.resolve(option.dictionaryPath, '..'),
    circle,
    option.rules,
    option.lineNumberIgnorePath,
    option.fileMaxLine
  );
}

function startServer(
  opts,
  denpendencyData: Tree,
  fileArch: Node,
  treeWithRule?: Tree,
  prefix?: string,
  circles?: string[][],
  rules?: string[][] | RegExp[][],
  lineNumberIgnorePath?: string,
  fileMaxLine?: number
) {
  const {
    port = 8887,
    host = '127.0.0.1',
    openBrowser = true,
    bundleDir = null,
    defaultSizes = 'parsed',
  } =
    opts || {};
  const projectRoot = path.resolve(__dirname, '../..');

  const app = new express();

  app.engine('ejs', require('ejs').renderFile);
  app.set('view engine', 'ejs');
  app.set('views', `${projectRoot}/src/template`);
  app.use(express.static(`${projectRoot}/src/static`));

  app.use('/getFileContent', (req, res) => {
    if (req.query.filePath) {
      const fileContent = fs.readFileSync(req.query.filePath).toString();
      res.send({ content: fileContent });
    } else {
      res.send({ content: '' });
    }
  });

  app.use('/', (req, res) => {
    res.set('Content-Type', 'text/html');
    res.render('denpendencyWithD3', {
      get denpencyData() {
        return JSON.stringify(denpendencyData);
      },
      get fileArch() {
        return JSON.stringify(fileArch);
      },
      get treeWithRule() {
        if (!treeWithRule) return '';
        return JSON.stringify(treeWithRule);
      },
      get pathPrefix() {
        return prefix || '';
      },
      get circles() {
        return JSON.stringify(circles || '');
      },
      get rules() {
        return JSON.stringify(rules || '');
      },
      get lineNumerIgnorePath() {
        return lineNumberIgnorePath || '';
      },
      get fileMaxLine() {
        return +fileMaxLine || '';
      },
    });
  });

  app.listen(port, () => {
    const url = `http://${host}:${port}`;
    console.log('listen:', host, port);
    if (openBrowser) {
      opener(url);
    }
  });
}
