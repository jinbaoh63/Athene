/**
 * @description bulleted list menu
 * @author wangfupeng
 */

import BaseMenu from './BaseMenu'
import { BULLETED_LIST_SVG } from '../../constants/svg'

class BulletedListMenu extends BaseMenu {
  type = 'bulleted-list'
  title = '无序列表'
  iconSvg = BULLETED_LIST_SVG
}

export default BulletedListMenu
