const shell = require('shelljs');
const assert = require('assert');
import * as path from 'path';
import { analyze } from '../../src/analyzer';
import { startAnalyze } from '../../src/graph/index';
import * as fs from 'fs';
function pr(file: string) {
  return path.resolve(__dirname, file);
}
describe('resoler', async () => {
  it('ts .ts', async () => {
    await startAnalyze({
      dictionaryPath: path.resolve('test/resources/fe.retail-admin/src', './'),
    });
    // generateFileTreeImage('test/resources/fe.retail-admin/src', 'test/resources/fe.retail-admin/')
    // const tree = await analyze({
    //   tsconfigPath: './test/resources/fe.retail-admin',
    //   dictionaryPath: './test/resources/fe.retail-admin/src',
    // });
    // console.log('-------tree', tree);
    // fs.writeFileSync('./testresult.json', JSON.stringify(tree));
    // //await getTsdenpenDences('./test/resources/ts-project/tsx/index.tsx')
  });
});
