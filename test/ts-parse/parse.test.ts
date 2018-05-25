const shell = require('shelljs');
const assert = require('assert');
import * as path from 'path';
import { getTsdenpenDences, parse } from '../../src/parser/ts';
import { analyze } from '../../src/analyzer';

import * as fs from 'fs';
function pr(file: string) {
  return path.resolve(__dirname, file);
}
describe('resoler', async () => {
  it('ts .ts', async () => {
   const res=  parse(pr('../resources/ts-project/tsx/index.tsx'), './test/tsconfig.json');
    // const res = getTsdenpenDences({
    //     tsConfigFilePath:'./test/tsconfig.json',
    //     filePath: pr('../resources/ts-project/tsx/index.tsx')
    // })
     console.log(res)
  });
});
