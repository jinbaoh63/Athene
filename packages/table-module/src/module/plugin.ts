/**
 * @description editor 插件，重写 editor API
 * @author wangfupeng
 */

import { Editor, Transforms, Point, Element, Descendant } from 'slate'
import { IDomEditor, DomEditor } from '@wangeditor/core'

// table cell 内部的删除处理
function deleteHandler(newEditor: IDomEditor): boolean {
  const { selection } = newEditor
  if (selection == null) return false

  const [cellNodeEntry] = Editor.nodes(newEditor, {
    // @ts-ignore
    match: n => n.type === 'table-cell',
  })
  if (cellNodeEntry) {
    const [, cellPath] = cellNodeEntry
    const start = Editor.start(newEditor, cellPath)

    if (Point.equals(selection.anchor, start)) {
      return true // 阻止删除 cell
    }
  }

  return false
}

function withTable<T extends IDomEditor>(editor: T): T {
  const { insertBreak, deleteBackward, deleteForward, normalizeNode } = editor
  const newEditor = editor

  // 重写 insertBreak - cell 内换行，只换行文本，不拆分 node
  newEditor.insertBreak = () => {
    const [nodeEntry] = Editor.nodes(newEditor, {
      // @ts-ignore
      match: n => n.type === 'table',
    })
    if (nodeEntry != null) {
      // 选中了 table ，则在 cell 内换行
      newEditor.insertText('\n')
      return
    }

    // 未选中 table ，默认的换行
    insertBreak()
  }

  // 重写 delete - cell 内删除，只删除文字，不删除 node
  newEditor.deleteBackward = unit => {
    const res = deleteHandler(newEditor)
    if (res) return // 命中 table cell ，自己处理删除

    // 执行默认的删除
    deleteBackward(unit)
  }
  newEditor.deleteForward = unit => {
    const res = deleteHandler(newEditor)
    if (res) return // 命中 table cell ，自己处理删除

    // 执行默认的删除
    deleteForward(unit)
  }

  // 重新 normalize
  newEditor.normalizeNode = ([node, path]) => {
    // @ts-ignore
    const { type = '', children: rows = [] } = node

    if (type !== 'table') {
      // 未命中 table ，执行默认的 normalizeNode
      return normalizeNode([node, path])
    }

    // --------------------- table 后面必须跟一个 p header blockquote（否则后面无法继续输入文字） ---------------------
    const topLevelNodes = newEditor.children || []
    const nextNode = topLevelNodes[path[0] + 1] || {}
    // @ts-ignore
    const { type: nextNodeType = '' } = nextNode
    if (
      nextNodeType !== 'paragraph' &&
      nextNodeType !== 'blockquote' &&
      !nextNodeType.startsWith('header')
    ) {
      // table node 后面不是 p 或 header ，则插入一个空 p
      const p = { type: 'paragraph', children: [{ text: '' }] }
      const insertPath = [path[0] + 1]
      Transforms.insertNodes(newEditor, p, {
        at: insertPath, // 在表格后面插入
      })
    }

    // --------------------- 保证 table 结构完整性（某些操作可能会导致操作 table 结构不完整） ---------------------
    // 是否正在修改中
    const changing = DomEditor.isChangingPath(newEditor, path)
    if (changing) {
      // table 正在修改中，则不操作
      return normalizeNode([node, path])
    }

    // 获取表格最多有多少列（表格结构乱掉之后，每一列数量不一样多）
    let maxColNum = 0
    rows.forEach((rowNode: Element) => {
      const cells = rowNode.children || []
      const l = cells.length
      if (maxColNum < l) maxColNum = l // TODO 这里没有考虑到 colSpan 和单元格合并
    })

    // 遍历每一行，修整
    rows.forEach((rowNode: Element, index: number) => {
      const cells = rowNode.children || []
      const rowPath = path.concat(index) // 当前 tr 的 path

      // 如果当前行，缺失 cell ，则补充
      // TODO 这里没有考虑到 colSpan 和单元格合并
      if (cells.length < maxColNum) {
        for (let i = cells.length; i < maxColNum; i++) {
          const cellPath = rowPath.concat(i) // cell path
          const newCell = { type: 'table-cell', children: [{ text: '' }] }
          Transforms.insertNodes(newEditor, newCell, {
            at: cellPath,
          })
        }
      }

      // 遍历每一个 cell ，修整
      cells.forEach((cellNode, i) => {
        // @ts-ignore
        if (cellNode.type !== 'table-cell') {
          const cellPath = rowPath.concat(i) // cell path
          Transforms.setNodes(
            newEditor,
            {
              // @ts-ignore
              type: 'table-cell',
            },
            {
              at: cellPath,
            }
          )
        }
      })
      // table row 修复结束
    })
  }

  // 可继续修改其他 newEditor API ...

  // 返回 editor ，重要！
  return newEditor
}

export default withTable
