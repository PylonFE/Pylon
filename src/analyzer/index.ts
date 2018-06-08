import { parse } from '../parser/ts';
import { tsReolveOptions } from '../resolver';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as _ from 'lodash';
import chalk from 'chalk';
const l = require('debug')('analyzer');
const DEFAULTIGNOREFILE = [/.*\.js$/, /.*\.d\.ts/];
const MATHCHEDFILE = [/.*\.tsx/, /.*\.ts/];
export interface Option {
  // 文件路径
  filePath?: string;
  // 文件夹路径
  dictionaryPath: string;
  ignore?: RegExp[];
  match?: RegExp[];
  tsconfigPath?: string;
}
type tsResolveMod = ts.ResolvedModuleFull | undefined;
export interface treeItem {
  notResolvedPaths?: string[];
  resolvedModules?: tsResolveMod[];
  denpendencesFileName: string[];
}
interface fileOption {
  filePath: string;
  tsconfigPath?: string;
}

interface TsConfigFactoryOptions {
  rootTsConfigPath: string;
  ignorePaths?: RegExp[];
}
const DEFAULTIGNOREDICTIONARY = [/node_modules/];
export interface Tree {
  [path: string]: treeItem;
}
function tsConfigFileResolver(
  options: TsConfigFactoryOptions = {
    rootTsConfigPath: '.',
    ignorePaths: [/node_modules/],
  }
): string {
  // 如果是路径带有tsconfig.json，不找了直接返回
  if (options.rootTsConfigPath.indexOf('tsconfig.json') > -1) {
    console.log(
      chalk.blue(
        '------------find tsconfig ' + path.resolve(options.rootTsConfigPath)
      )
    );
    return path.resolve(options.rootTsConfigPath);
  }
  if (!options.ignorePaths) {
    options.ignorePaths = DEFAULTIGNOREDICTIONARY;
  }
  const dirInfos = fs.readdirSync(options.rootTsConfigPath);

  const rootTsConfigPath = options.rootTsConfigPath;
  if (!dirInfos) {
    throw new Error(`readdirSync ${options.rootTsConfigPath} is null`);
  }

  function lazyDictionary(filePath: string) {
    let isIgnore;
    if (options.ignorePaths) {
      isIgnore = options.ignorePaths.some((reg) => {
        return reg.test(filePath);
      });
    }
    if (!isIgnore) {
      const path = tsConfigFileResolver({
        ...options,
        rootTsConfigPath: filePath,
      });
      if (path) {
        return path;
      } else {
        return '';
      }
    } else {
      return '';
    }
  }
  const lazyDictionaries = [];
  for (let i = 0; i < dirInfos.length; i++) {
    const fileName = dirInfos[i];
    const filePath = path.resolve(rootTsConfigPath, fileName);
    // l('------------filePath', filePath);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      if (fileName.indexOf('tsconfig.json') > -1) {
        // tsconfig.json 文件
        console.log(chalk.blue('------------find tsconfig ' + filePath));
        l('------------find tsconfig', filePath);
        return filePath;
      }
    } else if (stat.isDirectory()) {
      lazyDictionaries.push(filePath);
    }
  }

  for (let i = 0; i < lazyDictionaries.length; i++) {
    const path = lazyDictionary(lazyDictionaries[i]);
    if (path) {
      return path;
    }  
  }
  return ''
}
function isValidatePath(str: string): boolean {
  return !!str;
}

interface ICirleSaved {
  [key: string]: { count: number };
}

/**
 *
 * @param path 要分析的引用开始路径
 * @param tree 全局引用关系
 * @param saved 用于记录引用次数
 * @param ans 保存循环引用的数组
 */
function analyzeAPathExistCirleRefenrence(
  path: string,
  tree: Tree,
  saved: ICirleSaved = {},
  ans: string[] = [],
  level: number
) {
  const denpendences = tree[path] && tree[path].denpendencesFileName;
  if (!denpendences || !denpendences.length) return false;
  saved[path] = saved[path] || { count: 0 };
  let isPushed = false;

  if (level === 0) {
    ans.push(path);
    isPushed = true;
  }

  if (++saved[path].count >= 2) {
    // path 存在循環引用
    return true;
  }
  for (let i = 0; denpendences && i < denpendences.length; i++) {
    let denpenPath = denpendences[i];
    if (isValidatePath(denpenPath)) {
      ans.push(denpenPath);
      const anaRes = analyzeAPathExistCirleRefenrence(
        denpenPath,
        tree,
        saved,
        ans,
        level + 1
      );
      if (anaRes) {
        return true;
      }
      ans.pop();
    }
  }
  saved[path].count--;
  if (isPushed) {
    ans.pop();
  }
  return false;
}

/**
 * 
 * 
 * 1.分析特定文件的依赖关系 ，先搜索可能的tsconfig.json，根据这个tsconfig.json
 * 调用parse（有些包parse需要tsconfig.json）,解析出文件内对应的依赖,这个依赖都是相对路径
 * 这一步得到import 的那些值
 * 
 * 2.之后调用ts api 得到import的绝对路径
 * 
 * 3.再保存在树中
 * 
 * @param options fileOption
 *   filePath: 文件绝对路径;
  tsconfigPath: tsconfig.json 可能路径 会自动搜索;
 */
let tsconfigPath: string;
async function analyzeFile(options: fileOption): Promise<Tree> {
  const filePath = options.filePath;
  if (!path.isAbsolute(filePath)) {
    throw new Error(`${filePath}不是绝对路径`);
  }
  console.log(chalk.green(`开始分析 ${filePath}`));
  l(`开始分析 ${filePath}`);

  if (options.tsconfigPath && !tsconfigPath) {
    tsconfigPath = tsConfigFileResolver({
      rootTsConfigPath: options.tsconfigPath,
      ignorePaths: [/node_modules/],
    });
  } else if (!tsconfigPath) {
    tsconfigPath = tsConfigFileResolver();
  }
  // 不限制ts
  const denpendences = parse(filePath, tsconfigPath);
  let tsconfig: { compilerOptions: ts.CompilerOptions } = {
    compilerOptions: {},
  };
  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath).toString());
  } catch (e) {
    throw new Error('解析tsconfig---error' + e.message);
  }
  const tsdirName = path.dirname(tsconfigPath);
  if (
    tsconfig &&
    tsconfig.compilerOptions &&
    tsconfig.compilerOptions.baseUrl
  ) {
    const baseUrl = path.resolve(tsdirName, tsconfig.compilerOptions.baseUrl);
    tsconfig.compilerOptions.baseUrl = baseUrl;
  }
  const resolvedModules = denpendences.map((notResolvedDenpath: string) => {
    return tsReolveOptions({
      moduleName: notResolvedDenpath,
      containlingFile: options.filePath,
      optionsTsconfig: tsconfig.compilerOptions,
    });
  });
  console.log(chalk.green(`分析完成 ${filePath}`));
  l(`分析完成 ${filePath}`);
  tree[filePath] = {
    notResolvedPaths: denpendences,
    resolvedModules,
    denpendencesFileName: resolvedModules.map((item: tsResolveMod, index) => {
      return item && item.resolvedFileName
        ? path.resolve(item.resolvedFileName)
        : denpendences[index];
    }),
  };
  return tree;
}

/**
 * 分析文件夹结构，得到我们的tree结构，传入filePath的话，只分析filePath的的依赖关系，传入
 * dictionaryPath的话，会分析dictionaryPath下所有符合条件文件的依赖关系
 * @param options
 * @return Tree 结构
 */
const tree: Tree = {};
export async function analyze(options: Option): Promise<Tree> {
  // l('------------analyze options', options);
  if (options.filePath) {
    return await analyzeFile({
      filePath: options.filePath,
      tsconfigPath: options.tsconfigPath,
    });
  }
  if (!options.ignore) {
    options.ignore = DEFAULTIGNOREFILE;
  }
  if (!options.match) {
    options.match = MATHCHEDFILE;
  }

  if (options.dictionaryPath) {
    // l('------------analyze options.dictionaryPath', options.dictionaryPath);
    // 分析dictionaryPath中除了ignore之外的所有file
    const dirInfos = fs.readdirSync(options.dictionaryPath);
    if (!dirInfos) {
      throw new Error(`readdirSync ${options.dictionaryPath} is null`);
    }
    //l('------------analyze dirInfos', dirInfos);
    for (let i = 0; i < dirInfos.length; i++) {
      const fileName = dirInfos[i];
      const filePath = path.resolve(options.dictionaryPath, fileName);
      //l('------------analyze filePath', filePath);
      const stat = fs.statSync(filePath);
      const isIgnore = options.ignore.some((em) => {
        return em.test(filePath);
      });
      const isMatch = options.match.some((em) => {
        return em.test(filePath);
      });
      if (stat.isFile() && !isIgnore && isMatch) {
        await analyzeFile({
          filePath: filePath,
          tsconfigPath: options.tsconfigPath,
        });
      } else if (stat.isDirectory()) {
        await analyze({
          dictionaryPath: filePath,
          tsconfigPath: options.tsconfigPath,
        });
      }
    }
  }
  return tree;
}
function findSecondOccur(array: string[]): string[] {
  function findDuplicates(array: string[]) {
    for (let i = 0; i < array.length; i++) {
      for (let j = i + 1; j < array.length; j++) {
        if (array[i] === array[j]) {
          return [i, j];
        }
      }
    }
  }
  const [i, j] = findDuplicates(array) || [0, array.length - 1];
  return array.splice(i, j - i + 1);
}
function isTwoArrayIdentical(array_1: string[], array_2: string[]) {
  // clone
  const array1 = Array.from(array_1);
  const array2 = Array.from(array_2);
  return _.difference(array1, array2).length === 0;
}
export function analyzeCirle(tree: Tree) {
  let allFilePaths = Object.keys(tree);
  const cirles = [] as string[][];
  allFilePaths.forEach((path) => {
    let ans: string[] = [];

    if (analyzeAPathExistCirleRefenrence(path, tree, {}, ans, 0)) {
      let shouldPush = true;
      let cir: string[] = findSecondOccur(ans);
      for (let index = 0; index < cirles.length; index++) {
        const cirItem = cirles[index];
        if (isTwoArrayIdentical(cirItem, cir)) {
          // 过往的有相等的
          shouldPush = false;
        }
      }
      if (cirles.length === 0) {
        cir && cir.length && cirles.push(cir);
      } else if (shouldPush && cir && cir.length) {
        cirles.push(cir);
      }
    }
    ans = [];
  });
  return cirles;
}
