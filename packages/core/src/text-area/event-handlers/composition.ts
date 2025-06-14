/**
 * @description 监听 composition 事件
 * @author wangfupeng
 */

import { Editor, Range } from 'slate'
import { IDomEditor } from '../../editor/dom-editor'
import TextArea from '../TextArea'
import { hasEditableTarget } from '../helpers'
// import { IS_SAFARI, IS_FIREFOX } from '../../utils/ua'

export function handleCompositionStart(event: Event, textarea: TextArea, editor: IDomEditor) {
  if (!hasEditableTarget(editor, event.target)) return

  const { selection } = editor
  if (selection && !Range.isCollapsed(selection)) {
    // COMPAT: ctrl + A 全选，然后立刻使用中文输入法，会有 bug （官网 examples 也有这个问题）
    Editor.insertText(editor, '')
  }

  textarea.isComposing = true
}

export function handleCompositionEnd(event: Event, textarea: TextArea, editor: IDomEditor) {
  if (!hasEditableTarget(editor, event.target)) return
  textarea.isComposing = false

  // @ts-ignore
  const { data } = event

  // // COMPAT: In Chrome, `beforeinput` events for compositions
  // // aren't correct and never fire the "insertFromComposition"
  // // type that we need. So instead, insert whenever a composition
  // // ends since it will already have been committed to the DOM.
  // 没明白以上注释什么意思，会导致 firefox 无法使用输入法？？？
  // if (!IS_SAFARI && !IS_FIREFOX && data) {
  //     Editor.insertText(editor, data)
  // }

  // 这里暂且忽略浏览器判断，直接插入文本
  if (data) {
    Editor.insertText(editor, data)
  }
}
