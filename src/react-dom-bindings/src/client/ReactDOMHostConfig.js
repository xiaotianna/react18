import { setInitiailProperties, diffProperties, updateProperties } from './ReactDOMComponent'
import { precacheFiberNode, updateFiberProps } from './ReactDOMComponentTree'

// 判断当前的虚拟dom是否是纯文本
export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === 'string' || typeof props.children === 'number'
  )
}

export function createTextInstance(content) {
  return document.createTextNode(content)
}

/**
 * 创建真实 DOM
 * 同时把它对应的 Fiber 和 props 也保存到 DOM 上，供事件系统读取。
 * 也就是 precacheFiberNode 和 updateFiberProps
 * @param {*} type
 * @param {*} props
 * @param {*} fiberInst
 * @returns
 */
export function createInstance(type, props, fiberInst) {
  const domElement = document.createElement(type)
  // 提前缓存fiber节点的实例到dom节点上
  precacheFiberNode(fiberInst, domElement)
  // 把props属性直接保存在domElement的属性上
  updateFiberProps(domElement, props)
  return domElement
}

export function appendInitialChild(parent, child) {
  parent.appendChild(child)
}

export function finializeInitiailChildren(domElement, type, props) {
  // 设置初始属性
  setInitiailProperties(domElement, type, props)
}

export function appendChild(parent, child) {
  parent.appendChild(child)
}

export function insertBefore(parent, child, beforeChild) {
  parent.insertBefore(child, beforeChild)
}

// 收集差异，进行diff属性比较
export function prepareUpdate(domElement, type, oldProps, newProps) {
  // 比较新旧 props，把需要更新的内容整理成清单，交给提交阶段修改 DOM
  return diffProperties(domElement, type, oldProps, newProps)
}

export function commitUpdate(
  domElement,
  updatePayload,
  type,
  oldProps,
  newProps
) {
  // 执行之前收集的 DOM 更新
  updateProperties(domElement, updatePayload, type, oldProps, newProps)
  updateFiberProps(domElement, newProps)
}
