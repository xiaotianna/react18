import {
  createContainer,
  updateContainer
} from 'react-reconciler/src/ReactFiberReconciler'

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot
  // 传入的root就是FiberRootNode，也就是div#root
  updateContainer(children, root)
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
