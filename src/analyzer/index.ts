import { parse } from '../parser/ts';
import { tsReolveOptions, jsResolveOptions } from '../resolver';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as _ from 'lodash';
import chalk from 'chalk';
import * as debug from 'debug';
const l = debug('analyzer');

const DEFAULTIGNOREFILE = [/.*\.d\.ts/];
const MATHCHEDFILE = [/.*\.tsx$/, /.*\.jsx$/, /.*\.ts$/, /.*\.js$/];
const IGNOREDICTIONARYPATH = [/node_modules/, /\.git/, /\.vscode/, /\.build/];
const tree: Tree = {};
export interface Option {
  // 文件路径
  filePath?: string;
  // 文件夹路径
  dictionaryPath: string;
  ignoreDictionaryPath?: RegExp[];
  ignore?: RegExp[];
  match?: RegExp[];
  tsconfigPath?: string;
  alias?: {
    [path: string]: string;
  };
  isJs: boolean;
}
type tsResolveMod = ts.ResolvedModuleFull | undefined;
export interface ItreeItem {
  notResolvedPaths?: string[];
  resolvedModules?: tsResolveMod[];
  denpendencesFileName: string[];
}
interface IfileOption {
  filePath: string;
  tsconfigPath?: string;
  isJs: boolean;
  alias?: {
    [path: string]: string;
  };
}

interface TsConfigFactoryOptions {
  rootTsConfigPath: string;
  ignorePaths?: RegExp[];
}
const DEFAULTIGNOREDICTIONARY = [/node_modules/];
export interface Tree {
  [path: string]: ItreeItem;
}
/*
找出tsconfig文件
*/
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
      // tslint:disable-next-line:no-shadowed-variable
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
  const lazyDictionaries: string[] = [];
  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < dirInfos.length; i++) {
    const fileName = dirInfos[i];
    const filePath = path.resolve(rootTsConfigPath, fileName);
    // tslint:disable-next-line:no-commented-code
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

  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < lazyDictionaries.length; i++) {
    // tslint:disable-next-line:no-shadowed-variable
    const path = lazyDictionary(lazyDictionaries[i]);
    if (path) {
      return path;
    }
  }
  return '';
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
  // tslint:disable-next-line:no-shadowed-variable
  path: string,
  // tslint:disable-next-line:no-shadowed-variable
  tree: Tree,
  saved: ICirleSaved = {},
  ans: string[] = [],
  level: number,
  ansOfTwoArray: string[][] = [[]]
) {
  const denpendences = tree[path] && tree[path].denpendencesFileName;
  if (!denpendences || !denpendences.length) {
    return false;
  }
  saved[path] = saved[path] || { count: 0 };
  let isPushed = false;

  if (level === 0) {
    ans.push(path);
    isPushed = true;
  }

  if (++saved[path].count >= 2) {
    // path 存在循環引用
    saved[path].count--;
    return true;
  }
  for (let i = 0; denpendences && i < denpendences.length; i++) {
    const denpenPath = denpendences[i];
    if (isValidatePath(denpenPath)) {
      // 要考虑中途
      ans.push(denpenPath);
      const anaRes = analyzeAPathExistCirleRefenrence(
        denpenPath,
        tree,
        saved,
        ans,
        level + 1,
        ansOfTwoArray
      );
      if (anaRes) {
        ansOfTwoArray.push(_.cloneDeep(ans));
      }
      ans.pop();
    }
  }
  saved[path].count--;
  if (isPushed) {
    ans.pop();
  }
  // 每个返回都要减减
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
 *   tsconfigPath: tsconfig.json 可能路径 会自动搜索;
 */
let tsconfigPath: string;
export async function analyzeFile(options: IfileOption): Promise<Tree> {
  l('-------analyzeFile options', options);
  const filePath = options.filePath;
  if (!path.isAbsolute(filePath)) {
    throw new Error(`${filePath}不是绝对路径`);
  }
  console.log(chalk.green(`开始分析 ${filePath}`));
  l(`开始分析 ${filePath}`);

  // 不限制ts
  const denpendences = parse(filePath, tsconfigPath, options.isJs);
  l('-----denpendences', denpendences);
  if (options.isJs) {
    const resolvedModules = denpendences.map((notResolvedDenpath: string) => {
      return jsResolveOptions({
        moduleName: notResolvedDenpath,
        containlingFile: options.filePath,
        alias: options.alias,
      });
    });
    l('-----resolvedModules', resolvedModules);
    tree[filePath] = {
      notResolvedPaths: denpendences,
      resolvedModules,
      denpendencesFileName: resolvedModules.map((item: tsResolveMod, index) => {
        return item && item.resolvedFileName
          ? path.resolve(item.resolvedFileName)
          : denpendences[index];
      }),
    };
  } else {
    let tsconfig: { compilerOptions: ts.CompilerOptions } = {
      compilerOptions: {},
    };
    if (options.tsconfigPath && !tsconfigPath) {
      tsconfigPath = tsConfigFileResolver({
        rootTsConfigPath: options.tsconfigPath,
        ignorePaths: [/node_modules/],
      });
    } else if (!tsconfigPath) {
      tsconfigPath = tsConfigFileResolver();
    }
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
      // 转换baseUrl
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
    tree[filePath] = {
      notResolvedPaths: denpendences,
      resolvedModules,
      denpendencesFileName: resolvedModules.map((item: tsResolveMod, index) => {
        return item && item.resolvedFileName
          ? path.resolve(item.resolvedFileName)
          : denpendences[index];
      }),
    };
  }
  console.log(chalk.green(`分析完成 ${filePath}`));

  return tree;
}

/**
 * 分析文件夹结构，得到我们的tree结构，传入filePath的话，只分析filePath的的依赖关系，传入
 * dictionaryPath的话，会分析dictionaryPath下所有符合条件文件的依赖关系
 * @param options
 * @return Tree 结构
 */
// tslint:disable-next-line:cognitive-complexity
export async function analyze(options: Option): Promise<Tree> {
  // tslint:disable-next-line:no-commented-code
  // l('------------analyze options', options);
  if (options.filePath) {
    return await analyzeFile({
      filePath: options.filePath,
      tsconfigPath: options.tsconfigPath,
      isJs: options.isJs,
      alias: options.alias,
    });
  }
  if (!options.ignore) {
    options.ignore = options.isJs
      ? DEFAULTIGNOREFILE
      : [/.*\.js$/, ...DEFAULTIGNOREFILE];
  }
  if (!options.match) {
    options.match = MATHCHEDFILE;
  }
  if (!options.ignoreDictionaryPath) {
    options.ignoreDictionaryPath = IGNOREDICTIONARYPATH;
  }

  if (options.dictionaryPath) {
    // tslint:disable-next-line:no-commented-code
    // l('------------analyze options.dictionaryPath', options.dictionaryPath);
    // 分析dictionaryPath中除了ignore之外的所有file
    const dirInfos = fs.readdirSync(options.dictionaryPath);
    if (!dirInfos) {
      throw new Error(`readdirSync ${options.dictionaryPath} is null`);
    }
    // tslint:disable-next-line:no-commented-code
    l('------------analyze dirInfos', dirInfos);
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < dirInfos.length; i++) {
      const fileName = dirInfos[i];
      const filePath: string = path.resolve(options.dictionaryPath, fileName);
      const stat = fs.statSync(filePath);
      const isIgnore = options.ignore.some((em) => {
        return em.test(filePath);
      });
      const isMatch = options.match.some((em) => {
        return em.test(filePath);
      });
      if (stat.isFile() && !isIgnore && isMatch) {
        await analyzeFile({
          filePath,
          tsconfigPath: options.tsconfigPath,
          isJs: options.isJs,
          alias: options.alias,
        });
      } else if (stat.isDirectory()) {
        // tslint:disable-next-line:curly
        if (
          // 如果不是忽略的文件夹
          !options.ignoreDictionaryPath.some((regx) => {
            return regx.test(filePath);
          })
        ) {
          l(`分析文件夹 ${filePath}`);
          // filePath是文件夹路径
          await analyze({
            dictionaryPath: filePath,
            tsconfigPath: options.tsconfigPath,
            isJs: options.isJs,
            alias: options.alias,
          });
        } else {
          console.log(`遇到${options.ignoreDictionaryPath} 忽略`);
        }
      }
    }
  }
  return tree;
}
function findSecondOccur(array: string[]): string[] {
  if (array.length === 0) {
    return [];
  }
  // tslint:disable-next-line:no-shadowed-variable
  function findDuplicates(array: string[]) {
    // tslint:disable-next-line:no-shadowed-variable
    for (let i = 0; i < array.length; i++) {
      // tslint:disable-next-line:no-shadowed-variable
      for (let j = i + 1; j < array.length; j++) {
        if (array[i] === array[j]) {
          return [i, j];
        }
      }
    }
    return null;
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
// tslint:disable-next-line:no-shadowed-variable
export function analyzeCirle(tree: Tree) {
  const allFilePaths = Object.keys(tree);
  const cirles = [] as string[][];
  // tslint:disable-next-line:no-shadowed-variable
  allFilePaths.forEach((path) => {
    const ansTwoArray: string[][] = [[]];
    // ansTwoArray 保存 path的所有循环引用，以二维数组保存
    analyzeAPathExistCirleRefenrence(path, tree, {}, [], 0, ansTwoArray);
    for (const ans of ansTwoArray) {
      let shouldPush = true;
      const cir: string[] = findSecondOccur(ans);
      // tslint:disable-next-line:prefer-for-of
      for (let index = 0; index < cirles.length; index++) {
        const cirItem = cirles[index];
        if (isTwoArrayIdentical(cirItem, cir)) {
          // 过往的有相等的
          shouldPush = false;
        }
      }
      if (cirles.length === 0) {
        // tslint:disable-next-line:no-unused-expression
        cir && cir.length && cirles.push(cir);
      } else if (shouldPush && cir && cir.length) {
        cirles.push(cir);
      }
    }
  });
  return cirles;
}
