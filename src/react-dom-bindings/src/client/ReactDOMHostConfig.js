import { setInitiailProperties } from './ReactDOMComponent'

// 判断当前的虚拟dom是否是纯文本
export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === 'string' || typeof props.children === 'number'
  )
}

export function createTextInstance(content) {
  return document.createTextNode(content)
}

export function createInstance(type) {
  const domElement = document.createElement(type)
  // updateFiberProps(domElement, props)
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
