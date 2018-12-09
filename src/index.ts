import * as fs from 'fs';

import { startAnalyze, IuserOpton } from './graph';
import { Tree, analyze, analyzeFile } from './analyzer';
import { genBeDependentTree, genDepenceTree } from './graph/genDepenceTree';

class Pylon {
  private option: IuserOpton;
  constructor(option: IuserOpton) {
    this.option = option;
  }

  startAnalyze() {
    startAnalyze(this.option);
  }

  async genGTree(): Promise<Tree> {
    const { option } = this;
    let tree;
    if (option.statFile) {
      tree = JSON.parse(fs.readFileSync(option.statFile).toString());
    } else {
      tree = await analyze(
        Object.assign(this.option, { tsconfigPath: this.option.tsConfigPath })
      );
    }
    return tree;
  }
}
export { genDepenceTree, genBeDependentTree, analyzeFile, IuserOpton };
export default Pylon;
