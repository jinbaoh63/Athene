/**
 * @description menu interface
 * @author wangfupeng
 */

import { Node } from 'slate'
import { IDomEditor } from '../editor/dom-editor'
import { Dom7Array } from '../utils/dom'

export interface IPositionStyle {
  top?: string
  left?: string
  right?: string
  bottom?: string
}

export interface IOption {
  value: string
  text: string
  selected?: boolean
  styleForRenderMenuList?: { [key: string]: string } // 渲染菜单 list 时的样式
}

interface IBaseMenu {
  title: string
  iconSvg: string

  tag: string // 'button' | 'select'
  width?: number // 设置 button 宽度

  getValue: (editor: IDomEditor) => string | boolean // 获取菜单相关的 val 。如是否加粗、颜色值、h1/h2/h3 等
  isActive: (editor: IDomEditor) => boolean // 是否激活菜单，如选区处于加粗文本时，激活 bold
  isDisabled: (editor: IDomEditor) => boolean // 是否禁用菜单，如选区处于 code-block 时，禁用 bold 等样式操作

  exec: (editor: IDomEditor, value: string | boolean) => void // button click 或 select change 时触发
}

export interface IButtonMenu extends IBaseMenu {}

export interface ISelectMenu extends IBaseMenu {
  getOptions: (editor: IDomEditor) => IOption[] // select -> options
}

export interface IDropPanelMenu extends IBaseMenu {
  showDropPanel: boolean // 点击 'button' 显示 dropPanel
  getPanelContentElem: (editor: IDomEditor) => Dom7Array // showDropPanel 情况下，获取 content elem
}

export interface IModalMenu extends IBaseMenu {
  showModal: boolean // 点击 'button' 显示 modal
  modalWidth: number
  getModalContentElem: (editor: IDomEditor) => Dom7Array // showModal 情况下，获取 content elem
  getModalPositionNode: (editor: IDomEditor) => Node | null // 获取 modal 定位的 node ，null 即依据选区定位
}

export type MenuFactoryType = () => IButtonMenu | ISelectMenu | IDropPanelMenu | IModalMenu

export interface IMenuConf {
  key: string
  factory: MenuFactoryType
  config?: { [key: string]: any }
}
