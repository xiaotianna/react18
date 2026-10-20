import { logger } from 'shared/logger'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent
} from './ReactWorkTags'
import { processUpdateQueue } from './ReactFiberClassUpdateQueue'
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber'
import { shouldSetTextContent } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { renderWithHooks } from './ReactFiberHooks'

/**
 * 根据新的虚拟dom生成新的fiber链表
 * @param {*} current 老的父fiber：const current = unitOfWork.alternate
 * @param {*} workInProgress 新的父fiber
 * @param {*} nextChildren 新的子虚拟dom
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果此新fiber没有老fiber，说明此新fiber是新创建的
  if (current === null) {
    // 如图【docs/06-beginWork-03/image.png】，针对于h1节点，就是走这个逻辑
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren)
  } else {
    // 如果有老fiber的话，需要做dom diff，需要拿老的子fiber链表，和新的子虚拟dom进行比较，进行最小化的更新
    /**
     * 初始化的时候HostRootFiber调用reconcileChildFibers
     * 因为初始化的时候有两个HostRootFiber，使用alternate关联，构建新的Fiber树，也是这个新的根Fiber开始
     */
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    )
  }
}

// workInProgress -> 新fiber
function updateHostRoot(current, workInProgress) {
  /**
   * 一、需要知道它的子虚拟dom
   * 虚拟dom是由babel编译来的，也就是element，通过createRoot(dom).render(element)传入使用
   * 可以看【src/react-reconciler/src/ReactFiberReconciler.js】的updateContainer
   * workInProgress.memoizedState=payload，payload = { element }
   */
  processUpdateQueue(workInProgress)
  const nextState = workInProgress.memoizedState
  // 新的子虚拟dom（因为这个是HostRoot，所以有element）
  const nextChildren = nextState.element
  // 协调子节点（包含dom diff算法）
  // 根据新的虚拟dom生成子fiber链表
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

/**
 * 构建原生组件的子fiber链表
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 */
function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress
  const nextProps = workInProgress.pendingProps
  let nextChildren = nextProps.children
  // 优化：判断当前虚拟dom它的儿子是不是一个文本独生子，是的话就不单独当作一个fiber节点了
  const isDirectTextChild = shouldSetTextContent(type, nextProps)
  if (isDirectTextChild) {
    nextChildren = null
  }
  // 协调子节点，和上面的 updateHostRoot 方法中的一样
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

/**
 * 挂载函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 组件类型，也就是函数组件的定义
 */
function mountIndeterminateComponent(current, workInProgress, Component) {
  const props = workInProgress.pendingProps
  // value就是函数组件返回的虚拟dom
  // renderWithHooks内部相当于是在：const value = Component(props)，只是因为有hooks的逻辑需要单独抽离
  const value = renderWithHooks(current, workInProgress, Component, props)
  workInProgress.tag = FunctionComponent
  // 协调子节点，和上面的 updateHostRoot 方法中的一样
  reconcileChildren(current, workInProgress, value)
  return workInProgress.child
}

/**
 * 根据新虚拟dom去构建新的fiber子链表（child、child.slibing）
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @returns
 */
export function beginWork(current, workInProgress) {
  logger('beginWork', workInProgress)
  switch (workInProgress.tag) {
    // 在react中组件有两种，一种是函数组件，一种是类组件，本质都是函数，所以在beginWork不区分函数和类组件
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type
      )
    case HostRoot:
      return updateHostRoot(current, workInProgress)
    case HostComponent:
      return updateHostComponent(current, workInProgress)
    case HostText:
      return null
    default:
      return null
  }
}
