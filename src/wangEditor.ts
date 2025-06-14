/**
 * @description 入口文件
 * @author wangfupeng
 */

import './assets/style/common.less'
import './assets/style/icon.less'

import Editor from './editor/index'

// 检验是否浏览器环境
try {
    document
} catch (ex) {
    throw new Error('请在浏览器环境下运行')
}

console.log('hello we 10')

export default Editor
