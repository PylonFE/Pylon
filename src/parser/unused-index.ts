import { TypescriptParser } from 'typescript-parser';
import * as _ from 'lodash';
const precinct = require('precinct');

import * as fs from 'fs';
const parser = new TypescriptParser();

export async function getTsdenpenDences(pathOrSource: string) {
  // 所有的都已es6来
 
  const content = fs.readFileSync(pathOrSource).toString();
  
  let res = await precinct(content, {
    type: 'es6',
    es6: { mixedImports: true },
  });
  res  = _.uniq(res)
 
  return res;
}
