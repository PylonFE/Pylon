const shell = require('shelljs');
const assert = require('assert');
import * as path from 'path';
import reslover from '../../src/resolver';
import { tsReolve } from '../../src/resolver';
import * as fs from 'fs';
function pr(file: string) {
  return path.resolve(__dirname, file);
}
describe('resoler', () => {
  it('ts .ts', () => {
    const res = tsReolve(
      './b',
      path.resolve(__dirname, './ts-project/a.ts'),
      path.resolve(__dirname, './ts-project')
    );
    // console.log('resresres', res);
    assert.equal(res, path.resolve(__dirname, './ts-project/b.ts'));
  });

  it('.tsx', () => {
    const res = tsReolve('../b', pr('./ts-project/tsx/index.tsx'));
    assert.equal(res, path.resolve(__dirname, './ts-project/b.ts'));
  });

  it('@module alis path', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../tsconfig.json')).toString());
    const tsdirName = path.dirname(pr('../tsconfig.json'));
    console.log('***********tsdirName',tsdirName)
    const res = tsReolve(
      '@common/c',
      pr('./ts-project/tsx/index.tsx'),
      path.resolve(tsdirName,tsconfig.compilerOptions.baseUrl),
      { '@common/*': ['./resources/common/*'] },
      undefined,
      '../tsconfig.json'
    );
    // console.log('fewfwfewfewf232323', `${pr('../resources/common/*')}`);
    assert.equal(res, path.resolve(__dirname, '../resources/common/c.ts'));
  });

  it('type.d.ts', () => {
    const res = tsReolve('../dd', pr('./ts-project/tsx/index.tsx'));
    assert.equal(res, path.resolve(__dirname, './ts-project/dd.d.ts'));
  });

  it('type.d.ts', () => {
    const res = tsReolve('../ddd', pr('./ts-project/tsx/index.tsx'));
    assert.equal(res, path.resolve(__dirname, './ts-project/ddd.d.ts'));
  });

  it('nodemoduelss', () => {
    const tsconfig = fs.readFileSync(pr('../tsconfig.json')).toString();
    const res = tsReolve(
      'path',
      pr('./ts-project/tsx/index.tsx'),
      '',
      {},
      {
        ...JSON.parse(tsconfig),
        typeRoots: pr('../../node_modules/@types'),
      }
    );
    console.log('---------------', res);
    //assert.equal(res, path.resolve(__dirname, './ts-project/ddd.d.ts'));
  });

  it('nodemoduelss', () => {
    const tsconfig = fs.readFileSync(pr('../tsconfig.json')).toString();
    const res = tsReolve(
      'lodash',
      pr('./ts-project/tsx/index.tsx'),
      '',
      {},
      {
        ...JSON.parse(tsconfig),
        typeRoots: pr('../../node_modules/@types'),
      }
    );
    console.log('---------------', res);
    //assert.equal(res, path.resolve(__dirname, './ts-project/ddd.d.ts'));
  });

  it('external', () => {
    const res = tsReolve('chalk', pr('./ts-project/tsx/index.tsx'));
    
    console.log('---------------', res);
    //assert.equal(res, path.resolve(__dirname, './ts-project/ddd.d.ts'));
  });

  it('require commonjs', () => {
    const res = tsReolve('../dddd', pr('./ts-project/tsx/index.tsx'));
    
    console.log('---------------', res);
    //assert.equal(res, path.resolve(__dirname, './ts-project/ddd.d.ts'));
  });


  it('dy import', () => {
    const res = tsReolve('inquirer', pr('./ts-project/tsx/index.tsx'));
    
    console.log('---------------', res);
    //assert.equal(res, path.resolve(__dirname, './ts-project/ddd.d.ts'));
  });
});
