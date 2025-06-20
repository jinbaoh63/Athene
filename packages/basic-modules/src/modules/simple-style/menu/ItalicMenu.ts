/**
 * @description italic menu
 * @author wangfupeng
 */

import BaseMenu from './BaseMenu'
import { ITALIC_SVG } from '../../_helpers/icon-svg'

class ItalicMenu extends BaseMenu {
  mark = 'italic'
  title = '斜体'
  iconSvg = ITALIC_SVG
}

export default ItalicMenu
