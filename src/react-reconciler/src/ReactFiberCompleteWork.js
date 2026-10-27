import { logger } from 'shared/logger'
import {
  HostComponent,
  HostRoot,
  HostText,
  FunctionComponent
} from './ReactWorkTags'
import {
  createTextInstance,
  createInstance,
  appendInitialChild,
  finializeInitiailChildren,
  prepareUpdate
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { NoFlags, Update } from './ReactFiberFlags'

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

function markUpdate(workInProgress) {
  // 给当前的fiber添加更新的副作用
  workInProgress.flags |= Update
}

/**
 * 在fiber的完成阶段准备更新dom
 * ⚠️注意：
 * 对于根 Fiber、类组件 Fiber的updateQueue是shared.pending的数据结构
 * 但是对于HostComponent 原生 DOM 节点是以['属性', 值, ...] 形式的 DOM 差异数组
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} type
 * @param {*} newProps 新属性
 */
function updateHostComponent(current, workInProgress, type, newProps) {
  const oldProps = current.memoizedProps // 老属性
  const instance = workInProgress.stateNode // 老的dom节点
  // 比较新老属性，收集属性差异
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps)
  // 让原生组件的新fiber的更新队列等于这些差异（updatePayload是数组）
  // updatePayload数据结构：['id', 'btn2', 'children', '2']，就是属性、值
  workInProgress.updateQueue = updatePayload
  if (updatePayload) {
    markUpdate(workInProgress)
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
      // 如果老fiber存在，并且老fiber上有真实dom节点，要走节点更新的逻辑
      if (current !== null && workInProgress.stateNode !== null) {
        updateHostComponent(current, workInProgress, type, newProps)
      } else {
        // 创建真实dom
        const instance = createInstance(type, newProps, workInProgress)
        // 把自己所有的儿子都添加到自己身上
        appendAllChildren(instance, workInProgress)
        workInProgress.stateNode = instance
        finializeInitiailChildren(instance, type, newProps)
      }
      // 向上冒泡属性
      bubbleProperties(workInProgress)
      break
    case FunctionComponent: // 函数组件
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
