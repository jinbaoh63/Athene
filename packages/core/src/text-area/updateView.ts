/**
 * @description patch textarea view
 * @author wangfupeng
 */

import { h, VNode } from 'snabbdom'
import { IDomEditor } from '../editor/dom-editor'
import TextArea from './TextArea'
import { genPatchFn, normalizeVnodeData } from '../utils/vdom'
import $, { Dom7Array } from '../utils/dom'
import { node2Vnode } from '../formats/node2Vnode'
import {
  IS_FIRST_PATCH,
  TEXTAREA_TO_PATCH_FN,
  TEXTAREA_TO_VNODE,
  EDITOR_TO_ELEMENT,
  NODE_TO_ELEMENT,
  ELEMENT_TO_NODE,
} from '../utils/weak-maps'

function genElemId(id: number) {
  return `w-e-textarea-${id}`
}

/**
 * 生成编辑区域节点的 vnode
 * @param elemId elemId
 * @param readOnly readOnly
 */
function genRootVnode(elemId: string, readOnly = false): VNode {
  return h(`div#${elemId}`, {
    props: {
      contenteditable: readOnly ? false : true,
      suppressContentEditableWarning: true,
    },
    datasets: {
      slateEditor: true,
      slateNode: 'value',
    },
  })
}

/**
 * 生成编辑区域的 elem
 * @param elemId elemId
 * @param readOnly readOnly
 */
function genRootElem(elemId: string, readOnly = false): Dom7Array {
  const contentEditableAttr = readOnly ? '' : 'contenteditable="true"'
  return $(`<div
        id="${elemId}"
        ${contentEditableAttr}
        data-slate-editor
        data-slate-node="value"
        suppressContentEditableWarning
    ></div>`)
}

/**
 * 获取 editor.children 渲染 DOM
 * @param textarea textarea
 * @param editor editor
 */
function updateView(textarea: TextArea, editor: IDomEditor) {
  const $textAreaContainer = textarea.$textAreaContainer
  const elemId = genElemId(textarea.id)
  const config = editor.getConfig()

  // 生成 newVnode
  const newVnode = genRootVnode(elemId, config.readOnly)
  const content = editor.children || []
  newVnode.children = content.map((node, i) => {
    let vnode = node2Vnode(node, i, editor, editor)
    normalizeVnodeData(vnode) // 整理 vnode.data 以符合 snabbdom 的要求
    return vnode
  })

  let isFirstPatch = IS_FIRST_PATCH.get(textarea)
  if (isFirstPatch == null) isFirstPatch = true // 尚未赋值，也是第一次
  if (isFirstPatch) {
    // 第一次 patch ，先生成 elem
    const $textArea = genRootElem(elemId, config.readOnly)
    $textAreaContainer.append($textArea)
    textarea.$textArea = $textArea // 存储下编辑区域的 DOM 节点
    const textareaElem = $textArea[0]

    // 再生成 patch 函数，并执行
    const patchFn = genPatchFn()
    patchFn(textareaElem, newVnode)

    // 存储相关信息
    IS_FIRST_PATCH.set(textarea, false) // 不再是第一次 patch
    TEXTAREA_TO_PATCH_FN.set(textarea, patchFn) // 存储 patch 函数
  } else {
    // 不是第一次 patch
    const curVnode = TEXTAREA_TO_VNODE.get(textarea)
    const patchFn = TEXTAREA_TO_PATCH_FN.get(textarea)
    if (curVnode == null || patchFn == null) return

    patchFn(curVnode, newVnode)
  }

  const textareaElem = document.getElementById(elemId) as HTMLElement

  // focus - 无论是不是 firstPatch ，每次渲染都要判断 focus
  if (config.autoFocus) {
    ;(textareaElem as HTMLElement).focus()
  }

  // 存储相关信息
  TEXTAREA_TO_VNODE.set(textarea, newVnode) // 存储 vnode
  EDITOR_TO_ELEMENT.set(editor, textareaElem!) // 存储 editor -> elem 对应关系
  NODE_TO_ELEMENT.set(editor, textareaElem!)
  ELEMENT_TO_NODE.set(textareaElem!, editor)
}

export default updateView
