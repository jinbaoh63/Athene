/**
 * @description insert code-block menu
 * @author wangfupeng
 */

import { Editor, Transforms, Node } from 'slate'
import { IButtonMenu, IDomEditor, DomEditor } from '@wangeditor/core'
import { CODE_BLOCK_SVG } from '../../_helpers/icon-svg'
import { getSelectedNodeByType } from '../../_helpers/node'

class CodeBlockMenu implements IButtonMenu {
  title = '代码块'
  iconSvg = CODE_BLOCK_SVG
  tag = 'button'

  private getSelectCodeNode(editor: IDomEditor): Node | null {
    const codeNode = getSelectedNodeByType(editor, 'code')
    if (codeNode == null) return null
    const preNode = DomEditor.getParentNode(editor, codeNode)
    // @ts-ignore
    if (preNode.type !== 'pre') return null

    return codeNode
  }

  /**
   * 获取语言类型
   * @param editor editor
   */
  getValue(editor: IDomEditor): string | boolean {
    const node = this.getSelectCodeNode(editor)
    if (node == null) return ''

    // @ts-ignore
    return node.language || ''
  }

  isActive(editor: IDomEditor): boolean {
    const node = this.getSelectCodeNode(editor)
    return !!node
  }

  isDisabled(editor: IDomEditor): boolean {
    if (editor.selection == null) return true

    const [nodeEntry] = Editor.nodes(editor, {
      // @ts-ignore
      match: n => {
        // @ts-ignore
        const { type = '' } = n
        if (type === 'pre') return true // 代码块
        if (type === 'paragraph') return true // p
        return false
      },
      universal: true,
    })

    // 未匹配 p pre ，则禁用
    if (nodeEntry == null) return true
    return false
  }

  exec(editor: IDomEditor, value: string | boolean) {
    const active = this.isActive(editor)
    if (active) {
      // 当前处于 code-block ，需要转换为普通文本
      this.changeToPlainText(editor)
    } else {
      // 当前未处于 code-block ，需要转换为 code-block
      this.changeToCodeBlock(editor, value.toString())
    }
  }

  private changeToPlainText(editor: IDomEditor) {
    const codeNode = this.getSelectCodeNode(editor)
    if (codeNode == null) return

    // 获取 code 文本
    const str = Node.string(codeNode)

    // 删除当前最高层级的节点，即 pre 节点
    Transforms.removeNodes(editor, { mode: 'highest' })

    // 插入 p 节点
    const pList = str.split('\n').map(s => {
      return { type: 'paragraph', children: [{ text: s }] }
    })
    Transforms.insertNodes(editor, pList, { mode: 'highest' })
  }

  private changeToCodeBlock(editor: IDomEditor, language: string) {
    // 汇总选中的最高层级节点的字符串
    const strArr = []
    const nodeEntries = Editor.nodes(editor, {
      match: n => editor.children.includes(n), // 匹配选中的最高层级的节点
      universal: true,
    })
    for (let nodeEntry of nodeEntries) {
      const [n] = nodeEntry
      if (n) strArr.push(Node.string(n))
    }

    // 删除选中的最高层级的节点
    Transforms.removeNodes(editor, { mode: 'highest' })

    // 插入 pre 节点
    const newPreNode = {
      type: 'pre',
      children: [
        {
          type: 'code',
          language,
          children: [
            { text: strArr.join('\n') }, // 选中节点的纯文本
          ],
        },
      ],
    }
    Transforms.insertNodes(editor, newPreNode, { mode: 'highest' })
  }
}

export default CodeBlockMenu
