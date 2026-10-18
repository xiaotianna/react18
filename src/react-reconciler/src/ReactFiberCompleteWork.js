import { logger } from 'shared/logger'
import { HostComponent, HostRoot, HostText } from './ReactWorkTags'
import {
  createTextInstance,
  createInstance,
  appendInitialChild,
  finializeInitiailChildren
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { NoFlags } from './ReactFiberFlags'

/**
 * 把当前 Fiber 的子 Fiber 对应的真实 DOM，添加到当前 Fiber 自己的真实 DOM 上
 * 过程参考：【docs/07-completeWork/fiber-tree.png】
 * @param {*} parent 当前完成的fiber真实的dom节点（相比较子节点，当前节点属于parent）
 * @param {*} workInProgress 完成的fiber
 */
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child
  while (node) {
    if (node.tag === HostComponent || node.tag === HostText) {
      // 如果子节点类型是一个原生节点或者是一个文本节点
      appendInitialChild(parent, node.stateNode)
    } else if (node.child !== null) {
      // 如果第一个儿子不是一个原生节点，说明它可能是一个函数组件
      node = node.child
      continue
    }
    // 如果当前节点没有兄弟节点，就让其回到父节点
    while (node.sibling === null) {
      // 如果回到自身，就结束
      // node是workInProgress.child，所以需要return
      if (node.return === workInProgress) {
        return
      }
      node = node.return
    }
    node = node.sibling
  }
}

/**
 * 完成一个fiber节点
 * @param {*} current 老fiber
 * @param {*} workInProgress 新的构建的fiber
 */
export function completeWork(current, workInProgress) {
  logger('completeWork', workInProgress)
  const newProps = workInProgress.pendingProps
  switch (workInProgress.tag) {
    case HostRoot: // 根节点
      // 向上冒泡属性
      bubbleProperties(workInProgress)
      break
    case HostComponent: // 原生节点
      // 现在只是在处理创建或者挂载新节点的逻辑，后面此处分进行分区是初次挂载还是更新
      // 创建真实的dom节点
      const { type } = workInProgress
      const instance = createInstance(type, newProps, workInProgress)
      // 把自己所有的儿子都添加到自己身上
      appendAllChildren(instance, workInProgress)
      workInProgress.stateNode = instance
      finializeInitiailChildren(instance, type, newProps)
      // 向上冒泡属性
      bubbleProperties(workInProgress)
      break
    case HostText: // 文本节点
      /**
       * 如果完成的fiber是文本节点，就创建真实的文本节点
       * 创建文本 Fiber 时，就把文本内容直接存进了 pendingProps
       * 这个字段存什么，取决于 Fiber 的类型
       *  export function createFiberFromText(content) {
            return createFiber(HostText, content, null)
          }
       */
      const newText = newProps
      // 创建真实的dom节点并传入stateNode
      workInProgress.stateNode = createTextInstance(newText)
      // 向上冒泡属性
      bubbleProperties(workInProgress)
      break
  }
}

function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags
  // 遍历当前fiber的所有子节点，把所有子节点的副作用，以及子节点的子节点副作用全部合并
  let child = completedWork.child
  while (child !== null) {
    // 子节点的子节点副作用
    subtreeFlags |= child.subtreeFlags
    // 子节点的副作用
    subtreeFlags |= child.flags
    child = child.sibling
  }
  completedWork.subtreeFlags = subtreeFlags
}
