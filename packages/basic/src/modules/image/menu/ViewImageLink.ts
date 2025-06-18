/**
 * @description view image link menu
 * @author wangfupeng
 */

import { IButtonMenu, IDomEditor } from '@wangeditor/core'
import { getSelectedNodeByType } from '../../_helpers/node'
import { EXTERNAL_SVG } from '../../_helpers/icon-svg'

class ViewImageLink implements IButtonMenu {
  title = '查看链接'
  iconSvg = EXTERNAL_SVG
  tag = 'button'

  getValue(editor: IDomEditor): string | boolean {
    const imageNode = getSelectedNodeByType(editor, 'image')
    if (imageNode) {
      // @ts-ignore 选区处于 image node
      return imageNode.url || ''
    }
    return ''
  }

  isActive(editor: IDomEditor): boolean {
    const url = this.getValue(editor)
    return !!url
  }

  isDisabled(editor: IDomEditor): boolean {
    if (editor.selection == null) return true

    const url = this.getValue(editor)
    if (url) {
      // 有 image url ，则不禁用
      return false
    }
    return true
  }

  exec(editor: IDomEditor, value: string | boolean) {
    if (this.isDisabled(editor)) return

    if (!value || typeof value !== 'string') {
      throw new Error(`View image link failed, image.url is '${value}'`)
      return
    }

    // 查看链接
    window.open(value, '_blank')
  }
}

export default ViewImageLink
