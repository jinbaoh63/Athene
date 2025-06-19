/**
 * @description classic toolbar
 * @author wangfupeng
 */

import { debounce } from 'lodash-es'
import $, { Dom7Array } from '../../utils/dom'
import { MENU_ITEM_FACTORIES } from '../register'
import { promiseResolveThen } from '../../utils/util'
import { TOOLBAR_TO_EDITOR, BAR_ITEM_TO_EDITOR } from '../../utils/weak-maps'
import { IDomEditor } from '../../editor/dom-editor'
import { IBarItem, createBarItem, createBarItemGroup } from '../bar-item/index'
import { gen$barItemDivider } from '../helpers/helpers'
import { IMenuGroup } from '../interface'

class Toolbar {
  private $toolbar: Dom7Array
  private toolbarItems: IBarItem[] = []

  constructor(toolbarId: string) {
    const $toolbar = $(`#${toolbarId}`)
    $toolbar.on('mousedown', e => e.preventDefault())

    this.$toolbar = $toolbar

    // 注册 items 。异步，否则拿不到 editor 实例
    promiseResolveThen(() => {
      this.registerItems()
    })
  }

  // 注册 toolbarItems
  private registerItems() {
    const $toolbar = this.$toolbar
    const editor = this.getEditorInstance()
    const { toolbarKeys } = editor.getConfig() // 格式如 ['a', '|', 'b', 'c', '|', 'd']
    toolbarKeys.forEach(key => {
      if (key === '|') {
        // 分割线
        const $divider = gen$barItemDivider()
        $toolbar.append($divider)
        return
      }

      // 正常菜单
      if (typeof key === 'string') {
        this.registerSingleItem(key, $toolbar)
        return
      }

      // 菜单组
      this.registerGroup(key)
    })
  }

  // 注册菜单组
  private registerGroup(menu: IMenuGroup) {
    const $toolbar = this.$toolbar
    const group = createBarItemGroup(menu)
    const { menuKeys = [] } = menu

    // 注册子菜单
    menuKeys.forEach(key => {
      this.registerSingleItem(
        key,
        group.$container // 将子菜单，添加到自己的 container 中
      )
    })

    // 添加到 DOM
    $toolbar.append(group.$elem)
  }

  // 注册单个 toolbarItem
  private registerSingleItem(key: string, $container: Dom7Array) {
    const editor = this.getEditorInstance()

    const factory = MENU_ITEM_FACTORIES[key]
    if (factory == null) {
      throw new Error(`Not found menu item factory by key '${key}'`)
    }
    if (typeof factory !== 'function') {
      throw new Error(`Menu item factory (key='${key}') is not a function`)
    }

    // 创建 toolbarItem 并记录下
    const menu = factory()
    const toolbarItem = createBarItem(menu)
    this.toolbarItems.push(toolbarItem)

    // 保存 toolbarItem 和 editor 的关系
    BAR_ITEM_TO_EDITOR.set(toolbarItem, editor)
    toolbarItem.init() // 初始化

    // 添加 DOM
    $container.append(toolbarItem.$elem)
  }

  private getEditorInstance(): IDomEditor {
    const editor = TOOLBAR_TO_EDITOR.get(this)
    if (editor == null) throw new Error('Can not get editor instance')
    return editor
  }

  /**
   * editor onChange 时触发（涉及 DOM 操作，加防抖）
   */
  onEditorChange = debounce(() => {
    this.toolbarItems.forEach(toolbarItem => {
      toolbarItem.onSelectionChange()
    })
  }, 200)
}

export default Toolbar
