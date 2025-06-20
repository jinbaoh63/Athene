/**
 * @description update link menu
 * @author wangfupeng
 */

import { Transforms, Node } from 'slate'
import { IModalMenu, IDomEditor, DomEditor, hideAllPanelsAndModals } from '@wangeditor/core'
import $, { Dom7Array } from '../../../utils/dom'
import { genRandomStr } from '../../../utils/util'
import { genModalInputElems, genModalButtonElems } from '../../_helpers/menu'
import { checkNodeType, getSelectedNodeByType } from '../../_helpers/node'
import { PENCIL_SVG } from '../../_helpers/icon-svg'

/**
 * 生成唯一的 DOM ID
 */
function genDomID(): string {
  return genRandomStr('w-e-update-link')
}

class UpdateLink implements IModalMenu {
  title = '修改链接'
  iconSvg = PENCIL_SVG
  tag = 'button'
  showModal = true // 点击 button 时显示 modal
  modalWidth = 300

  private $content: Dom7Array | null = null
  private urlInputId = genDomID()
  private buttonId = genDomID()

  /**
   * 获取 node.url
   * @param editor editor
   */
  getValue(editor: IDomEditor): string | boolean {
    const linkNode = getSelectedNodeByType(editor, 'link')
    if (linkNode) {
      // @ts-ignore
      return linkNode.url || ''
    }
    return ''
  }

  isActive(editor: IDomEditor): boolean {
    const url = this.getValue(editor)
    return !!url
  }

  exec(editor: IDomEditor, value: string | boolean) {
    // 点击菜单时，弹出 modal 之前，不需要执行其他代码
    // 此处空着即可
  }

  isDisabled(editor: IDomEditor): boolean {
    if (editor.selection == null) return true

    const linkNode = getSelectedNodeByType(editor, 'link')

    // 未匹配到 link node 则禁用
    if (linkNode == null) return true
    return false
  }

  getModalPositionNode(editor: IDomEditor): Node | null {
    return getSelectedNodeByType(editor, 'link')
  }

  getModalContentElem(editor: IDomEditor): Dom7Array {
    const { urlInputId, buttonId } = this

    // 获取 input button elem
    const [$urlContainer, $inputUrl] = genModalInputElems('链接网址', urlInputId)
    const [$buttonContainer] = genModalButtonElems(buttonId, '确定')

    if (this.$content == null) {
      // 第一次渲染
      const $content = $('<div></div>')

      // 绑定事件（第一次渲染时绑定，不要重复绑定）
      $content.on('click', 'button', e => {
        e.preventDefault()
        const url = $(`#${urlInputId}`).val()
        this.updateLink(editor, url)
      })

      // 记录属性，重要
      this.$content = $content
    }

    const $content = this.$content
    $content.html('') // 先清空内容

    // append input and button
    $content.append($urlContainer)
    $content.append($buttonContainer)

    // 设置 input val
    const url = this.getValue(editor)
    $inputUrl.val(url)

    // focus 一个 input（异步，此时 DOM 尚未渲染）
    setTimeout(() => {
      $(`#${urlInputId}`).focus()
    })

    return $content
  }

  /**
   * 修改 link
   * @param editor editor
   * @param url url
   */
  private updateLink(editor: IDomEditor, url: string) {
    if (!url) {
      hideAllPanelsAndModals() // 隐藏 modal
      return
    }

    // 还原选区
    DomEditor.restoreSelection(editor)

    if (this.isDisabled(editor)) return

    // 修改链接
    Transforms.setNodes(
      editor,
      // @ts-ignore
      { url },
      {
        match: n => checkNodeType(n, 'link'),
      }
    )

    // 隐藏 modal
    hideAllPanelsAndModals()
  }
}

export default UpdateLink
