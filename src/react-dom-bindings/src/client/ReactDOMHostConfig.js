import { setInitiailProperties } from './ReactDOMComponent'
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
