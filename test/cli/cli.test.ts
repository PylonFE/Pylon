// const shell = require('shelljs');
import * as shell from 'shelljs';
const assert = require('assert');
import * as path from 'path';
import { getTsdenpenDences } from '../../src/parser';
import { analyze } from '../../src/analyzer';
import { getFileTreeDataWithPath,getTreeDataWithPath } from '../../src/graph/index'
import * as fs from 'fs';
function pr(file: string) {
  return path.resolve(__dirname, file);
}
describe('resoler', async () => {
  it('ts .ts', async () => {
    shell.exec('denpen')
  });
});
