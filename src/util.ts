import { Node } from './graph/';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
export function isTsRelateve(filename: string) {
  return filename.match(/\.ts/gi);
}
interface Inode {
  name: string;
}
interface Ilink {
  source: number;
  target: number;
}
// 根据文件路径获得nodes，links结构数据
export function getNodesLinksDataWithDictionary(
  rootPath: string,
  nodes: Inode[] = [],
  links: Ilink[] = [],
  indexOfParent: number
) {
  const stat = fs.statSync(rootPath);
  if (!stat.isDirectory() && !isTsRelateve(rootPath)) {
    // 是文件 不是ts相关文件
    return;
  }
  const indexOfChildren = nodes.push({ name: rootPath }) - 1;

  if (indexOfChildren !== 0) {
    links.push({
      source: indexOfParent,
      target: indexOfChildren,
    });
  }
  if (!stat.isDirectory()) {
    // 是文件
    return;
  }
  const dirInfos = fs.readdirSync(rootPath);
  for (let index = 0; dirInfos && index < dirInfos.length; index++) {
    const subPath = dirInfos[index];
    const filePath = path.resolve(rootPath, subPath);
    getNodesLinksDataWithDictionary(filePath, nodes, links, indexOfChildren);
  }
}

/*获得一段文本的行数*/
export function getStrLineNumber(str: string) {
  const match = str.match(/(.*)[\n|\r]/g);
  if (!match) {
    return 0;
  }
  return match.length;
}

// 把文件结构转化为树装结构
export function getTreeDataWithDictionary(rootPath: string, parentNode: Node) {
  const stat = fs.statSync(rootPath);
  if (!stat.isDirectory() && !isTsRelateve(rootPath)) {
    // 是文件 不是ts相关文件
    return;
  }
  const node = {} as Node;
  node.name = rootPath;

  parentNode.children = parentNode.children || [];
  parentNode.children.push(node);
  if (!stat.isDirectory()) {
    // 如果是文件
    node.totalLineNumber = getStrLineNumber(
      fs.readFileSync(rootPath).toString()
    );
    if (node.totalLineNumber === 0) {
      console.log(chalk.bgRedBright(`${rootPath} is empty!!!!`));
    }
    node.size = (stat.size / 1024).toFixed(2) + 'kb';
    return;
  }
  const dirInfos = fs.readdirSync(rootPath);
  for (let index = 0; dirInfos && index < dirInfos.length; index++) {
    const subPath = dirInfos[index];
    node.children = node.children || [];
    const filePath = path.resolve(rootPath, subPath);
    getTreeDataWithDictionary(filePath, node);
  }
}
