import { readFileSync } from 'fs';
import * as _ from 'lodash';
import Project, { ScriptTarget, SyntaxKind, ts } from 'ts-simple-ast';
 
const l = require('debug')('parse');
interface option {
  tsConfigFilePath: string;
  filePath: string;
}

export function getTsdenpenDences(options: option, res = []) {
  const project = new Project({
    tsConfigFilePath: options.tsConfigFilePath,
  });
  const sourceFile = project.addExistingSourceFile(options.filePath); // or addExistingSourceFileIfExists
  // get them all
  const imports = sourceFile.getImportDeclarations();
  for (let i = 0; i < imports.length; i++) {
    const importDeclaration = imports[i];
    const denpen = importDeclaration.getModuleSpecifierValue();
    res.push(denpen);
  }
  return res;
}
export function walk(sourceFile: ts.SourceFile) {
  const denpendences = [];
  _walk(sourceFile);

  function _walk(node: ts.Node) {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      return;
    }
    if (node.kind === SyntaxKind.CallExpression) {
      //非贪婪
      const matched = node.getText().match(/(import|require)\((.+?)\)/);
      matched && denpendences.push(matched[2].replace(/'|"/g, ''));
    }    
    ts.forEachChild(node, _walk);
  }
  return denpendences;
}
export function parse(fileName, tsConfigFilePath) {
  // Parse a file
  let sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName).toString(),
    ScriptTarget.ESNext,
    /*setParentNodes */ true
  );
  // walk it
  let denpendencesWithoutWalker = getTsdenpenDences({
    filePath: fileName,
    tsConfigFilePath: tsConfigFilePath,
  });
  let denpendences = walk(sourceFile);
  denpendences = denpendencesWithoutWalker.concat(denpendences);
  return _.uniq(denpendences);
}
