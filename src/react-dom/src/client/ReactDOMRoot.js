import { createContainer } from 'react-reconciler/src/ReactFiberReconciler'

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

/**
 *
 * @param {*} container container 真实dom容器
 * @example createRoot(document.querySelector('#root'))
 */
export function createRoot(container) {
  // 创建内部根：FiberRootNode
  const root = createContainer(container)
  // 创建对外对象：ReactDOMRoot，并保存内部根
  return new ReactDOMRoot(root)
}
