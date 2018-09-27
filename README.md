# Pylon
[![build](https://img.shields.io/npm/v/pylonn.svg?style=flat-square)](https://www.npmjs.com/package/pylonn) 
[![build](https://img.shields.io/npm/l/express.svg)](https://www.npmjs.com/package/pylonn)
[![download](https://img.shields.io/npm/dm/pylonn.svg?style=flat-square)](https://www.npmjs.com/package/pylonn)

名称取自星际争霸神族水晶塔，意在为项目提供支持

ts项目分析工具 



### 以树状文件夹形式查看依赖

1. 依赖查看可视化(支持动态import, require分析)
3. 循环引用检测
4. 指定引用标记
2. 行数标记，大小统计
5. 项目代码统计等

```js
//todo
```

1. 函数复杂度检测
2. 依赖文件大小告警
3. UI 交互优化
4. ......


（动态图片可点击查看）

使用方法：

```js
npm install pylonn
or
yarn add pylonn
then
dependence -p ./src
```


 ```js
-p, --path <file>
用于指定要分析的项目路径，如果不传，默认为当前命令行运行路径
 ```

 ```js
-g --gen-stat-file <file>
用于指定是否生成本地分析文件，类似于webpack生成stat.json
 ```

 ```js
-f, --stat-file <file>
用于指定要读取的结果文件，可不传
 ```

 ```js
 -r, --rules <rule>
 用于指定的规则数组，为一个二维数组，保存需要标红的依赖路径
 ```

```js
  example: --rules [[\\'client\\',\\'server\\'],[\\'server\\',\\'client\\']]
  指定client和server不能互引
```

```js
-c, --circle 指定是否检测循环引用
```

```js
-l, --line-number-ignore-path <path>
统计文件时要忽略的文件路径
```

```js
-m, --file-max-line <max>
配置单个文件最大行数标注
```

```js
-t, --ts-config-path <path>
用于指定tsconfig.json的目录位置 ,可不传 将自动搜索路径最浅的tsconfig.json文件
```
