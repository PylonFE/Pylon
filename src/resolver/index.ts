import * as debug from 'debug';
const l = debug('resolve');
import * as ts from 'typescript';

interface ItsOptions {
  moduleName: string;
  containlingFile: string;
  optionsTsconfig?: ts.CompilerOptions;
}

interface IjsOptions {
  moduleName: string;
  containlingFile: string;
  alias:
    | {
        [key: string]: string;
      }
    | undefined;
}

/**
 * ts 自身实现了类似node的resolver,但是增加了d.ts等类型的搜索
 */
export function tsReolveOptions(
  options: ItsOptions
): ts.ResolvedModuleFull | undefined {
  options.optionsTsconfig = options.optionsTsconfig || {};
  const host = ts.createCompilerHost({
    ...options.optionsTsconfig,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  } as ts.CompilerOptions);
  l('----tsResolveOptions', options);
  const resolvedModule = ts.resolveModuleName(
    options.moduleName,
    options.containlingFile,
    {
      ...options.optionsTsconfig,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    } as ts.CompilerOptions,
    host
  ).resolvedModule;
  l('ts resolved module: ', resolvedModule);
  return resolvedModule;
}

export function jsResolveOptions(options: IjsOptions) {
  let paths: any = {};
  const { alias } = options;
  const host = ts.createCompilerHost({
    allowJs: true,
  });
  if (alias) {
    Object.keys(alias).forEach((path) => {
      paths[path + '/*'] = [alias[path] + '/*'];
    });
  }
  l('paths', paths);
  const { moduleName, containlingFile } = options;
  const resolvedModule = ts.resolveModuleName(
    moduleName,
    containlingFile,
    {
      allowJs: true,
      baseUrl: '.',
      paths,
    },
    host
  ).resolvedModule;
  return resolvedModule;
}
