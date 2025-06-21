/**
 * @description del col menu
 * @author wangfupeng
 */

import { isEqual } from 'lodash-es'
import { Editor, Transforms, Range, Node } from 'slate'
import { IButtonMenu, IDomEditor, DomEditor } from '@wangeditor/core'
import { getSelectedNodeByType } from '../_helpers/node'
import { DEL_COL_SVG } from '../../constants/svg'

class DeleteCol implements IButtonMenu {
  title = '删除列'
  iconSvg = DEL_COL_SVG
  tag = 'button'

  getValue(editor: IDomEditor): string | boolean {
    // 无需获取 val
    return ''
  }

  isActive(editor: IDomEditor): boolean {
    // 无需 active
    return false
  }

  isDisabled(editor: IDomEditor): boolean {
    const { selection } = editor
    if (selection == null) return true
    if (!Range.isCollapsed(selection)) return true

    const cellNode = getSelectedNodeByType(editor, 'table-cell')
    if (cellNode == null) {
      // 选区未处于 table cell node ，则禁用
      return true
    }
    return false
  }

  exec(editor: IDomEditor, value: string | boolean) {
    if (this.isDisabled(editor)) return

    const [cellEntry] = Editor.nodes(editor, {
      // @ts-ignore
      match: n => n.type === 'table-cell',
      universal: true,
    })
    const [selectedCellNode, selectedCellPath] = cellEntry

    // 如果只有一列，则删除整个表格
    const rowNode = DomEditor.getParentNode(editor, selectedCellNode)
    const colLength = rowNode?.children.length || 0
    if (!rowNode || colLength <= 1) {
      Transforms.removeNodes(editor, { mode: 'highest' }) // 删除整个表格
      return
    }

    // ------------------------- 不只有 1 列，则继续 -------------------------

    // 【注意】临时记录 tableNode path ，重要！！！ 执行完之后再删除
    // 这样做，可以避免被 normalize 误伤
    const selectedTablePath = selectedCellPath.slice(0, 1)
    DomEditor.recordChangingPath(editor, selectedTablePath)

    const tableNode = DomEditor.getParentNode(editor, rowNode)
    if (tableNode == null) return

    // 遍历所有 rows ，挨个删除 cell
    const rows = tableNode.children || []
    rows.forEach(row => {
      // @ts-ignore
      const cells = row.children || []
      // 遍历一个 row 的所有 cells
      cells.forEach((cell: Node) => {
        const path = DomEditor.findPath(editor, cell)
        if (
          path.length === selectedCellPath.length &&
          isEqual(path.slice(-1), selectedCellPath.slice(-1)) // 俩数组，最后一位相同
        ) {
          // 如果当前 td 的 path 和选中 td 的 path ，最后一位相同，说明是同一列
          // 删除当前的 cell
          Transforms.removeNodes(editor, { at: path })
        }
      })
    })

    // 及时删除记录，重要！！！
    DomEditor.deleteChangingPath(editor)
  }
}

export default DeleteCol
