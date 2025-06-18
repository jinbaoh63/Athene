# we-2021

## 准备工作

- 了解 slate.js
- 了解 vdom 和 snabbdom.js
- 了解 lerna
- 已安装 yarn

## 本地启动

- 下载代码到本地
- 安装所有依赖 `yarn bootstrap`
- 打包 core 模块
  - `cd packages/core`
  - `yarn dev` （本地环境打包，不压缩代码）
- 打包 basic 模块
  - `cd packages/basic`
  - `yarn dev`
- 打包其他功能模块（如有）
- 打包 editor 模块
  - `cd packages/editor`
  - `yarn dev`
- 浏览器访问 `examples/index.html`

## 注意事项

- 修改代码、重新打包后，要**强制刷新**浏览器
- 如果本地包依赖有问题，试试 `lerna link` 关联内部包

## 记录

全局安装一个插件 `yarn add xxx --dev -W`

打包形式
- `yarn dev` 本地打包
- `yarn dev-watch` 本地打包，并监听变化
- `yarn build` 生产环境打包，压缩代码，产出 mjs

注意合理使用 `peerDependencies` 和 `dependencies` ，不要重复打包一个第三方库

执行 `lerna add ...` 之后，需要重新 `lerna link` 建立内部连接
