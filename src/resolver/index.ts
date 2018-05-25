import * as path from 'path';
import { resolve } from 'url';
const l = require('debug')('resolve');
import * as ts from 'typescript';
import * as fs from 'fs';

interface tsOptions {
  moduleName: string;
  containlingFile: string;
  optionsTsconfig?: ts.CompilerOptions;
}
/**
 * ts 自身实现了类似node的resolver,但是增加了d.ts等类型的搜索
 */
export function tsReolveOptions(
  options: tsOptions
): ts.ResolvedModuleFull | undefined {
  options.optionsTsconfig = options.optionsTsconfig || {};
  const host = ts.createCompilerHost({
    ...options.optionsTsconfig,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  } as ts.CompilerOptions);
  const resolvedModule = ts.resolveModuleName(
    options.moduleName,
    options.containlingFile,
    {
      ...options.optionsTsconfig,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    } as ts.CompilerOptions,
    host as ts.ModuleResolutionHost
  ).resolvedModule;
  l('ts resolved module: ', resolvedModule);
  return resolvedModule;
}
