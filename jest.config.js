const path = require('path');

global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (num) => {
  return clearTimeout(num);
};

module.exports = {
  // 用于 Jest 忽略 SCSS 文件
//   process(src, filename) {
//     return 'module.exports = ' + JSON.stringify(path.basename(filename)) + ';';
//   },
  "verbose": true,
  "setupFiles": [
    "<rootDir>/jest.config.js",
  ],
  "globals": {
    "ts-jest": {
      "tsConfigFile": "./test/tsconfig.json"
    }
  },
  "transform": {
    "^.+\\.tsx?$": "<rootDir>/node_modules/ts-jest/preprocessor.js",
    "^.+\\.ts?$": "ts-jest",
    "^.+\\.css?$": "<rootDir>/jest.config.js",
    "^.+\\.svg?$": "<rootDir>/jest.config.js"
  },
  "testRegex": "./test/.*\\.test\\.ts",
  // "(server/__test__/.*\\.(test|spec))\\.(tsx?|jsx?|ts?|js?)$",
//   "moduleNameMapper": {
//     "@server/util/util": "<rootDir>/src/server/__test__/util",
//     "@server/(.*)": "<rootDir>/src/server/$1"
//   },
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "json",
    "jsx"
  ],
  //"collectCoverage": true,
  //"mapCoverage": true,
  "modulePathIgnorePatterns": [
    "./test/resources/fe.retail-admin"
  ],
//   "collectCoverageFrom": [
//     //"src/client/*.{ts,tsx}",
//     "src/server/route/**/*.{ts,tsx}",
//     "!**/node_modules/**",
//     "!**/vendor/**",
//     "!src/**/*.d.ts"
//   ],
//   "coverageReporters": [
//     "lcov",
//     "text",
//     "text-summary"
//   ]
};
