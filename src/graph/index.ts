import * as path from 'path';
import { analyze, Tree, Option, analyzeCirle } from '../analyzer';

import opener = require('opener');
import * as express from 'express';

import chalk from 'chalk';
import * as fs from 'fs';

import * as _ from 'lodash';
import { getTreeDataWithDictionary } from '../util';

export interface Node {
  name: string;
  children: Node[];
  size?: string | number;
  totalLineNumber?: string | number;
}

function findAllWithPredictInArray<T>(
  arr: T[],
  predict: (element: T) => boolean
) {
  if (!Array.isArray(arr)) {
    return [];
  }
  const res: T[] = [];
  // tslint:disable-next-line:prefer-for-of
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
// tslint:disable-next-line:cognitive-complexity
export function calcMatchedPaths(
  tree: Tree,
  pathRegExpArray: string[][] | RegExp[][]
): Tree {
  const treeWithRule: Tree = {};
  const allSourceFiles = Object.keys(tree);
  // tslint:disable-next-line:prefer-for-of
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
    const allMatchedSourceFile = findAllWithPredictInArray<string>(
      allSourceFiles,
      (souceFileName) => {
        return sourceRegExp.test(souceFileName);
      }
    );

    // tslint:disable-next-line:prefer-for-of
    for (let indexF = 0; indexF < allMatchedSourceFile.length; indexF++) {
      const matchedSourceFile = allMatchedSourceFile[indexF];
      const targetFilesNamesWithMatchedSourceFile =
        tree[matchedSourceFile].denpendencesFileName;
      const targetMatchedFilesNamesWithMatchedSourceFiles = findAllWithPredictInArray(
        targetFilesNamesWithMatchedSourceFile,
        (targetFileName) => {
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
interface IuserOpton extends Option {
  genStatFile?: string;
  statFile?: string;
  rules?: string[][] | RegExp[][];
  circle?: boolean;
  lineNumberIgnorePath?: string;
  fileMaxLine?: number;
  tsConfigPath?: string;
  isJs: boolean;
}
export async function startAnalyze(option: IuserOpton) {
  const saved = {} as Node;
  if (!path.isAbsolute(option.dictionaryPath)) {
    option.dictionaryPath = path.resolve(option.dictionaryPath);
  }

  console.log('option.dictionaryPath', option.dictionaryPath);
  let tree;
  if (option.statFile) {
    tree = JSON.parse(fs.readFileSync(option.statFile).toString());
  } else {
    try {
      tree = await analyze(
        Object.assign(option, { tsconfigPath: option.tsConfigPath })
      );
    } catch (e) {
      console.error(e);
    }
  }

  try {
    getTreeDataWithDictionary(option.dictionaryPath, saved);
  } catch (e) {
    console.error(e);
  }
  if (option.genStatFile) {
    fs.writeFileSync(option.genStatFile, JSON.stringify(tree));
  }
  let treeWithRule;
  if (option.rules) {
    // 不管tree是哪里得到的
    try {
      treeWithRule = calcMatchedPaths(tree, option.rules);
    } catch (e) {
      console.error(e);
      treeWithRule = {};
    }
    const keysWithRules = Object.keys(treeWithRule);
    console.log(chalk.bold(`分析关系 ${option.rules} \r\n`));
    for (const key of keysWithRules) {
      console.log(
        chalk.blueBright(
          `${JSON.stringify(key)}
------- 依赖 --------->
${JSON.stringify(treeWithRule[key].denpendencesFileName) + '\r\n'}
`
        )
      );
    }
  }
  let circle;
  if (option.circle) {
    circle = analyzeCirle(tree);
    console.log(chalk.bold('循环引用路径二维数组存储： \n\r'));
    for (const circleItem of circle) {
      console.log(
        chalk.redBright(
          `循环引用 --------->
${JSON.stringify(circleItem) + '\r\n'}
`
        )
      );
    }
  }

  startServer(
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
  denpendencyData: Tree,
  fileArch: Node,
  treeWithRule?: Tree,
  prefix?: string,
  circles?: string[][],
  rules?: string[][] | RegExp[][],
  lineNumberIgnorePath?: string,
  fileMaxLine?: number
) {
  const { port = 8887, host = '127.0.0.1', openBrowser = true } = {};
  const projectRoot = path.resolve(__dirname, '../..');

  const app = express();

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

  app.use('/', (_req, res) => {
    res.set('Content-Type', 'text/html');
    res.render('denpendencyWithD3', {
      get denpencyData() {
        return JSON.stringify(denpendencyData);
      },
      get fileArch() {
        return JSON.stringify(fileArch);
      },
      get treeWithRule() {
        if (!treeWithRule) {
          return '';
        }
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
        if (!fileMaxLine) {
          return '';
        }
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
