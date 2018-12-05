import { readFileSync } from 'fs';
import * as _ from 'lodash';
import Project, { ScriptTarget, SyntaxKind, ts } from 'ts-simple-ast';
import * as debug from 'debug';
const l = debug('parse');
interface Ioption {
  tsConfigFilePath: string;
  filePath: string;
}

export function getTsdenpenDences(
  options: Ioption,
  res: string[] = [],
  isJs?: boolean
) {
  const project = new Project(
    options.tsConfigFilePath
      ? {
          tsConfigFilePath: options.tsConfigFilePath,
        }
      : {}
  );
  let sourceFile;
  if (isJs) {
    // sholdnot call save
    sourceFile = project.addExistingSourceFile(
      options.filePath
    );
  } else {
    sourceFile = project.addExistingSourceFile(options.filePath); // or addExistingSourceFileIfExists
  }
  // get them all
  const imports = sourceFile.getImportDeclarations();
  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < imports.length; i++) {
    const importDeclaration = imports[i];
    const denpen = importDeclaration.getModuleSpecifierValue();
    res.push(denpen);
  }
  return res;
}
export function walk(sourceFile: ts.SourceFile) {
  const denpendences: string[] = [];
  _walk(sourceFile);

  function _walk(node: ts.Node) {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      l(`node.kind === SyntaxKind.ImportDeclaration`);
      return;
    }
    if (node.kind === SyntaxKind.CallExpression) {
      // 非贪婪
      const matched = node.getText().match(/(import|require)\((.+?)\)/);
      // tslint:disable-next-line:no-unused-expression
      matched && denpendences.push(matched[2].replace(/'|"/g, ''));
    }
    ts.forEachChild(node, _walk);
  }
  return denpendences;
}
export function parse(
  fileName: string,
  tsConfigFilePath: string,
  isJs: boolean
) {
  // Parse a file ts js都可以
  l('--------analyzeFile', fileName, tsConfigFilePath, isJs);
  const sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName).toString(),
    ScriptTarget.ESNext,
    /*setParentNodes */ true
  );
  // walk it
  const denpendencesWithoutWalker = getTsdenpenDences(
    {
      filePath: fileName,
      tsConfigFilePath,
    },
    [],
    isJs
  );
  let denpendences = walk(sourceFile);
  denpendences = denpendencesWithoutWalker.concat(denpendences);
  return _.uniq(denpendences);
}
