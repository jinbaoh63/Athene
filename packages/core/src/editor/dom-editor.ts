/**
 * @description 扩展 slate Editor（参考 slate-react react-editor.ts ）
 * @author wangfupeng
 */

import { isEqual } from 'lodash-es'
import { Editor, Node, Path, Point, Range, Transforms, Ancestor } from 'slate'
import { IConfig } from '../config/index'
import { Key } from '../utils/key'
import {
  EDITOR_TO_ELEMENT,
  ELEMENT_TO_NODE,
  IS_FOCUSED,
  IS_READ_ONLY,
  KEY_TO_ELEMENT,
  NODE_TO_INDEX,
  NODE_TO_KEY,
  NODE_TO_PARENT,
  CHANGING_NODE_PATH,
  EDITOR_TO_SELECTION,
} from '../utils/weak-maps'
import {
  DOMElement,
  DOMNode,
  DOMPoint,
  DOMRange,
  DOMSelection,
  DOMStaticRange,
  isDOMElement,
  normalizeDOMPoint,
} from '../utils/dom'

/**
 * 扩展 slate Editor 接口
 */
export interface IDomEditor extends Editor {
  insertData: (data: DataTransfer) => void
  setFragmentData: (data: DataTransfer) => void
  getConfig: () => IConfig
  handleTab: () => void
}

/**
 * 自定义全局 command
 */
export const DomEditor = {
  /**
   * Find a key for a Slate node.
   * key 即一个累加不重复的 id ，每一个 slate node 都对对应一个 key ，意思相当于 node.id
   */
  findKey(editor: IDomEditor, node: Node): Key {
    let key = NODE_TO_KEY.get(node)

    // 如果没绑定，就立马新建一个 key 来绑定
    if (!key) {
      key = new Key()
      NODE_TO_KEY.set(node, key)
    }

    return key
  },

  /**
   * Find the path of Slate node.
   * path 是一个数组，代表 slate node 的位置 https://docs.slatejs.org/concepts/03-locations#path
   */
  findPath(editor: IDomEditor, node: Node): Path {
    const path: Path = []
    let child = node

    // eslint-disable-next-line
    while (true) {
      const parent = NODE_TO_PARENT.get(child)

      if (parent == null) {
        if (Editor.isEditor(child)) {
          // 已到达最顶层，返回 patch
          return path
        } else {
          break
        }
      }

      // 获取该节点在父节点中的 index
      const i = NODE_TO_INDEX.get(child)

      if (i == null) {
        break
      }

      // 拼接 patch
      path.unshift(i)

      // 继续向上递归
      child = parent
    }

    throw new Error(`Unable to find the path for Slate node: ${JSON.stringify(node)}`)
  },

  /**
   * 获取父节点
   * @param editor editor
   * @param node cur node
   */
  getParentNode(editor: IDomEditor, node: Node): Ancestor | null {
    return NODE_TO_PARENT.get(node) || null
  },

  /**
   * Check if the editor is focused.
   */
  isFocused(editor: IDomEditor): boolean {
    return !!IS_FOCUSED.get(editor)
  },

  /**
   * Check if the editor is in read-only mode.
   */
  isReadOnly(editor: IDomEditor): boolean {
    return !!IS_READ_ONLY.get(editor)
  },

  /**
   * Blur the editor.
   */
  blur(editor: IDomEditor): void {
    const el = DomEditor.toDOMNode(editor, editor)
    IS_FOCUSED.set(editor, false)

    if (window.document.activeElement === el) {
      el.blur()
    }
  },

  /**
   * Find the native DOM element from a Slate node or editor.
   */
  toDOMNode(editor: IDomEditor, node: Node): HTMLElement {
    let domNode
    const isEditor = Editor.isEditor(node)
    if (isEditor) {
      domNode = EDITOR_TO_ELEMENT.get(editor)
    } else {
      const key = DomEditor.findKey(editor, node)
      domNode = KEY_TO_ELEMENT.get(key)
    }

    if (!domNode) {
      throw new Error(`Cannot resolve a DOM node from Slate node: ${JSON.stringify(node)}`)
    }

    return domNode
  },

  /**
   * Focus the editor.
   */
  focus(editor: IDomEditor): void {
    const el = DomEditor.toDOMNode(editor, editor)
    IS_FOCUSED.set(editor, true)

    if (window.document.activeElement !== el) {
      el.focus({ preventScroll: true })
    }
  },

  /**
   * Deselect the editor.
   * 删除选区，包括 DOM selection 和 slate selection
   */
  deselect(editor: IDomEditor): void {
    const { selection } = editor
    const domSelection = window.getSelection()

    if (domSelection && domSelection.rangeCount > 0) {
      domSelection.removeAllRanges()
    }

    if (selection) {
      Transforms.deselect(editor)
    }
  },

  /**
   * Check if a DOM node is within the editor.
   */
  hasDOMNode(editor: IDomEditor, target: DOMNode, options: { editable?: boolean } = {}): boolean {
    const { editable = false } = options
    const editorEl = DomEditor.toDOMNode(editor, editor)
    let targetEl

    // COMPAT: In Firefox, reading `target.nodeType` will throw an error if
    // target is originating from an internal "restricted" element (e.g. a
    // stepper arrow on a number input). (2018/05/04)
    // https://github.com/ianstormtaylor/slate/issues/1819
    try {
      targetEl = (isDOMElement(target) ? target : target.parentElement) as HTMLElement
    } catch (err) {
      if (!err.message.includes('Permission denied to access property "nodeType"')) {
        throw err
      }
    }

    if (!targetEl) {
      return false
    }

    return (
      // 祖先节点中包括 data-slate-editor 属性，即 textarea
      targetEl.closest(`[data-slate-editor]`) === editorEl &&
      // 这里不解何意 ？？？
      (!editable || targetEl.isContentEditable || !!targetEl.getAttribute('data-slate-zero-width'))
    )
  },

  /**
   * Insert data from a `DataTransfer` into the editor.
   */
  insertData(editor: IDomEditor, data: DataTransfer): void {
    editor.insertData(data)
  },

  /**
   * Sets data from the currently selected fragment on a `DataTransfer`.
   */
  setFragmentData(editor: IDomEditor, data: DataTransfer): void {
    editor.setFragmentData(data)
  },

  // 获取 editor 配置信息
  getConfig(editor: IDomEditor): IConfig {
    return editor.getConfig()
  },

  /**
   * Find a native DOM range from a Slate `range`.
   *
   * Notice: the returned range will always be ordinal regardless of the direction of Slate `range` due to DOM API limit.
   *
   * there is no way to create a reverse DOM Range using Range.setStart/setEnd
   * according to https://dom.spec.whatwg.org/#concept-range-bp-set.
   */
  toDOMRange(editor: IDomEditor, range: Range): DOMRange {
    const { anchor, focus } = range
    const isBackward = Range.isBackward(range)
    const domAnchor = DomEditor.toDOMPoint(editor, anchor)
    const domFocus = Range.isCollapsed(range) ? domAnchor : DomEditor.toDOMPoint(editor, focus)

    const domRange = window.document.createRange()
    const [startNode, startOffset] = isBackward ? domFocus : domAnchor
    const [endNode, endOffset] = isBackward ? domAnchor : domFocus

    // A slate Point at zero-width Leaf always has an offset of 0 but a native DOM selection at
    // zero-width node has an offset of 1 so we have to check if we are in a zero-width node and
    // adjust the offset accordingly.
    const startEl = (isDOMElement(startNode) ? startNode : startNode.parentElement) as HTMLElement
    const isStartAtZeroWidth = !!startEl.getAttribute('data-slate-zero-width')
    const endEl = (isDOMElement(endNode) ? endNode : endNode.parentElement) as HTMLElement
    const isEndAtZeroWidth = !!endEl.getAttribute('data-slate-zero-width')

    domRange.setStart(startNode, isStartAtZeroWidth ? 1 : startOffset)
    domRange.setEnd(endNode, isEndAtZeroWidth ? 1 : endOffset)
    return domRange
  },

  /**
   * Find a native DOM selection point from a Slate point.
   */
  toDOMPoint(editor: IDomEditor, point: Point): DOMPoint {
    const [node] = Editor.node(editor, point.path)
    const el = DomEditor.toDOMNode(editor, node)
    let domPoint: DOMPoint | undefined

    // If we're inside a void node, force the offset to 0, otherwise the zero
    // width spacing character will result in an incorrect offset of 1
    if (Editor.void(editor, { at: point })) {
      // void 节点，offset 必须为 0
      point = { path: point.path, offset: 0 }
    }

    // For each leaf, we need to isolate its content, which means filtering
    // to its direct text and zero-width spans. (We have to filter out any
    // other siblings that may have been rendered alongside them.)
    const selector = `[data-slate-string], [data-slate-zero-width]`
    const texts = Array.from(el.querySelectorAll(selector))
    let start = 0

    for (const text of texts) {
      const domNode = text.childNodes[0] as HTMLElement

      if (domNode == null || domNode.textContent == null) {
        continue
      }

      const { length } = domNode.textContent
      const attr = text.getAttribute('data-slate-length')
      const trueLength = attr == null ? length : parseInt(attr, 10)
      const end = start + trueLength

      if (point.offset <= end) {
        const offset = Math.min(length, Math.max(0, point.offset - start))
        domPoint = [domNode, offset]
        break
      }

      start = end
    }

    if (!domPoint) {
      throw new Error(`Cannot resolve a DOM point from Slate point: ${JSON.stringify(point)}`)
    }

    return domPoint
  },

  /**
   * Find a Slate node from a native DOM `element`.
   */
  toSlateNode(editor: IDomEditor, domNode: DOMNode): Node {
    let domEl = isDOMElement(domNode) ? domNode : domNode.parentElement

    if (domEl && !domEl.hasAttribute('data-slate-node')) {
      domEl = domEl.closest(`[data-slate-node]`)
    }

    const node = domEl ? ELEMENT_TO_NODE.get(domEl as HTMLElement) : null

    if (!node) {
      throw new Error(`Cannot resolve a Slate node from DOM node: ${domEl}`)
    }

    return node
  },

  /**
   * Get the target range from a DOM `event`.
   */
  findEventRange(editor: IDomEditor, event: any): Range {
    if ('nativeEvent' in event) {
      // 兼容 react 的合成事件，DOM 事件中没什么用
      event = event.nativeEvent
    }

    const { clientX: x, clientY: y, target } = event

    if (x == null || y == null) {
      throw new Error(`Cannot resolve a Slate range from a DOM event: ${event}`)
    }

    const node = DomEditor.toSlateNode(editor, event.target)
    const path = DomEditor.findPath(editor, node)

    // If the drop target is inside a void node, move it into either the
    // next or previous node, depending on which side the `x` and `y`
    // coordinates are closest to.
    if (Editor.isVoid(editor, node)) {
      const rect = target.getBoundingClientRect()
      const isPrev = editor.isInline(node)
        ? x - rect.left < rect.left + rect.width - x
        : y - rect.top < rect.top + rect.height - y

      const edge = Editor.point(editor, path, {
        edge: isPrev ? 'start' : 'end',
      })
      const point = isPrev ? Editor.before(editor, edge) : Editor.after(editor, edge)

      if (point) {
        const range = Editor.range(editor, point)
        return range
      }
    }

    // Else resolve a range from the caret position where the drop occured.
    let domRange
    const { document } = window

    // COMPAT: In Firefox, `caretRangeFromPoint` doesn't exist. (2016/07/25)
    if (document.caretRangeFromPoint) {
      domRange = document.caretRangeFromPoint(x, y)
    } else {
      const position = document.caretPositionFromPoint(x, y)
      if (position) {
        domRange = document.createRange()
        domRange.setStart(position.offsetNode, position.offset)
        domRange.setEnd(position.offsetNode, position.offset)
      }
    }

    if (!domRange) {
      throw new Error(`Cannot resolve a Slate range from a DOM event: ${event}`)
    }

    // Resolve a Slate range from the DOM range.
    const range = DomEditor.toSlateRange(editor, domRange)
    return range
  },

  /**
   * Find a Slate range from a DOM range or selection.
   */
  toSlateRange(editor: IDomEditor, domRange: DOMRange | DOMStaticRange | DOMSelection): Range {
    const el = domRange instanceof Selection ? domRange.anchorNode : domRange.startContainer
    let anchorNode
    let anchorOffset
    let focusNode
    let focusOffset
    let isCollapsed

    if (el) {
      if (domRange instanceof Selection) {
        anchorNode = domRange.anchorNode
        anchorOffset = domRange.anchorOffset
        focusNode = domRange.focusNode
        focusOffset = domRange.focusOffset
        isCollapsed = domRange.isCollapsed
      } else {
        anchorNode = domRange.startContainer
        anchorOffset = domRange.startOffset
        focusNode = domRange.endContainer
        focusOffset = domRange.endOffset
        isCollapsed = domRange.collapsed
      }
    }

    if (anchorNode == null || focusNode == null || anchorOffset == null || focusOffset == null) {
      throw new Error(`Cannot resolve a Slate range from DOM range: ${domRange}`)
    }

    const anchor = DomEditor.toSlatePoint(editor, [anchorNode, anchorOffset])
    const focus = isCollapsed ? anchor : DomEditor.toSlatePoint(editor, [focusNode, focusOffset])

    return { anchor, focus }
  },

  /**
   * Find a Slate point from a DOM selection's `domNode` and `domOffset`.
   */
  toSlatePoint(editor: IDomEditor, domPoint: DOMPoint): Point {
    const [nearestNode, nearestOffset] = normalizeDOMPoint(domPoint)
    const parentNode = nearestNode.parentNode as DOMElement
    let textNode: DOMElement | null = null
    let offset = 0

    if (parentNode) {
      const voidNode = parentNode.closest('[data-slate-void="true"]')
      let leafNode = parentNode.closest('[data-slate-leaf]')
      let domNode: DOMElement | null = null

      // Calculate how far into the text node the `nearestNode` is, so that we
      // can determine what the offset relative to the text node is.
      if (leafNode) {
        textNode = leafNode.closest('[data-slate-node="text"]')!
        const range = window.document.createRange()
        range.setStart(textNode, 0)
        range.setEnd(nearestNode, nearestOffset)
        const contents = range.cloneContents()
        const removals = [
          // @ts-ignore
          ...contents.querySelectorAll('[data-slate-zero-width]'),
          // @ts-ignore
          ...contents.querySelectorAll('[contenteditable=false]'),
        ]

        removals.forEach(el => {
          el!.parentNode!.removeChild(el)
        })

        // COMPAT: Edge has a bug where Range.prototype.toString() will
        // convert \n into \r\n. The bug causes a loop when slate-react
        // attempts to reposition its cursor to match the native position. Use
        // textContent.length instead.
        // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10291116/
        offset = contents.textContent!.length
        domNode = textNode
      } else if (voidNode) {
        // For void nodes, the element with the offset key will be a cousin, not an
        // ancestor, so find it by going down from the nearest void parent.

        leafNode = voidNode.querySelector('[data-slate-leaf]')!
        textNode = leafNode.closest('[data-slate-node="text"]')!
        domNode = leafNode
        offset = domNode.textContent!.length
      }

      // COMPAT: If the parent node is a Slate zero-width space, editor is
      // because the text node should have no characters. However, during IME
      // composition the ASCII characters will be prepended to the zero-width
      // space, so subtract 1 from the offset to account for the zero-width
      // space character.
      if (
        domNode &&
        offset === domNode.textContent!.length &&
        parentNode.hasAttribute('data-slate-zero-width')
      ) {
        offset--
      }
    }

    if (!textNode) {
      throw new Error(`Cannot resolve a Slate point from DOM point: ${domPoint}`)
    }

    // COMPAT: If someone is clicking from one Slate editor into another,
    // the select event fires twice, once for the old editor's `element`
    // first, and then afterwards for the correct `element`. (2017/03/03)
    const slateNode = DomEditor.toSlateNode(editor, textNode!)
    const path = DomEditor.findPath(editor, slateNode)
    return { path, offset }
  },

  // 临时记录当前正在发生变化的 node path
  recordChangingPath(editor: IDomEditor, path: Path) {
    CHANGING_NODE_PATH.set(editor, path)
  },
  deleteChangingPath(editor: IDomEditor) {
    CHANGING_NODE_PATH.delete(editor)
  },
  isChangingPath(editor: IDomEditor, path: Path): boolean {
    const curPath = CHANGING_NODE_PATH.get(editor) || []
    return isEqual(curPath, path)
  },

  restoreSelection(editor: IDomEditor) {
    const selection = EDITOR_TO_SELECTION.get(editor)
    if (selection == null) return

    this.focus(editor)
    Transforms.select(editor, selection)
  },
}
