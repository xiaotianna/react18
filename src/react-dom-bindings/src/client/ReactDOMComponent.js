import { setValueForStyles } from './CSSPropertyOperations'
import setTextContent from './setTextContent'
import { setValueForProperty } from './DOMPropertyOperations'

const STYLE = 'style'
const CHILDREN = 'children'

// 设置dom初始属性
function setInitiailDOMProperties(tag, domElement, nextProps) {
  for (const propKey in nextProps) {
    if (nextProps.hasOwnProperty(propKey)) {
      const nextProp = nextProps[propKey]
      if (propKey === STYLE) {
        setValueForStyles(domElement, nextProp)
      } else if (propKey === CHILDREN) {
        if (typeof nextProp === 'string') {
          setTextContent(domElement, nextProp)
        } else if (typeof nextProp === 'number') {
          setTextContent(domElement, `${nextProp}`)
        }
      } else if (nextProp !== null) {
        setValueForProperty(domElement, propKey, nextProp)
      }
    }
  }
}

/**
 * 设置初始属性
 * @param {*} domElement
 * @param {*} tag 类型type，但是源码是tag，div、span
 * @param {*} props
 */
export function setInitiailProperties(domElement, tag, props) {
  setInitiailDOMProperties(tag, domElement, props)
}

/**
 * 比较新旧 props，把需要更新的内容整理成清单，交给提交阶段修改 DOM
 * 需要循环两次，防止新旧有漏掉的属性，两个方向各遍历一轮，分工不同：
    - 旧 → 新：检查旧属性在新对象里是否还存在，记录需要删除的属性。
    - 新 → 旧：检查新属性是否新增、值是否变化，记录需要设置的属性。
 * @param {*} domElement
 * @param {*} type
 * @param {*} lastProps
 * @param {*} nextProp
 */
export function diffProperties(domElement, type, lastProps, nextProps) {
  // 保存最终的更新清单，后续用它更新 DOM，数据结构为['id', 'newId', 'children', '新文本', 'style', { color: 'blue' }]
  let updatePayload = null
  // 保存当前遍历到的 props 属性名
  let propKey
  // 保存当前遍历到的样式属性名
  let styleName
  // 保存样式内部的差异，有差异时才创建对象
  let styleUpdates = null

  // 遍历旧 props，找出需要删除的属性
  for (propKey in lastProps) {
    // 如果新对象里有这个属性，或者老的没有这个属性，或者老的是个null，就继续
    if (
      nextProps.hasOwnProperty(propKey) ||
      !lastProps.hasOwnProperty(propKey) ||
      lastProps[propKey] === null
    ) {
      continue
    }
    // style 中需要删除的样式记录成空字符串，比如 { color: '' }
    if (propKey === STYLE) {
      const lastStyle = lastProps[propKey]
      for (styleName in lastStyle) {
        if (lastStyle.hasOwnProperty(styleName)) {
          if (!styleUpdates) {
            styleUpdates = {}
          }
          styleUpdates[styleName] = ''
        }
      }
    } else {
      // 普通属性记录为 [属性名, null]，后续调用 removeAttribute
      ;(updatePayload = updatePayload || []).push(propKey, null)
    }
  }

  // 遍历新 props，并取出新旧值
  /**
   *  // 旧 props：{ id: 'old' }
      // 新 props：{ id: 'new' }
      propKey = 'id'
      lastProp = 'old'
      nextProp = 'new'
   */
  for (propKey in nextProps) {
    // 新属性的值
    const nextProp = nextProps[propKey]
    // 老属性的值
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined
    if (
      !nextProps.hasOwnProperty(propKey) ||
      nextProp === lastProp ||
      (nextProp === null && lastProp === null)
    ) {
      continue
    }
    if (propKey === STYLE) {
      if (lastProp) {
        // 要计算删除的行内样式
        for (styleName in lastProp) {
          // 如果此样式对象里的某个属性老的style里有，新的style没有
          if (
            lastProp.hasOwnProperty(styleName) &&
            (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = ''
          }
        }
        // 遍历新的样式对象
        for (styleName in nextProp) {
          // 如果新的属性没有，并且新属性的值和老属性不一样
          if (
            nextProp.hasOwnProperty(styleName) &&
            lastProp[styleName] !== nextProp[styleName]
          ) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = nextProp[styleName]
          }
        }
      } else {
        styleUpdates = nextProp
      }
    } else if (propKey === CHILDREN) {
      if (typeof nextProp === 'string' || typeof nextProp === 'number') {
        ;(updatePayload = updatePayload || []).push(propKey, nextProp)
      }
    } else {
      ;(updatePayload = updatePayload || []).push(propKey, nextProp)
    }
  }

  if (styleUpdates) {
    ;(updatePayload = updatePayload || []).push(STYLE, styleUpdates)
  }
  return updatePayload
}

export function updateProperties(domElement, updatePayload) {
  updateDOMProperties(domElement, updatePayload)
}

function updateDOMProperties(domElement, updatePayload) {
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i]
    const propValue = updatePayload[i + 1]
    if (propKey === STYLE) {
      setValueForStyles(domElement, propValue)
    } else if (propKey === CHILDREN) {
      setTextContent(domElement, propValue)
    } else {
      setValueForProperty(domElement, propKey, propValue)
    }
  }
}
