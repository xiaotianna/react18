import { logger } from 'shared/logger'
import { HostComponent, HostRoot, HostText } from './ReactWorkTags'
import { processUpdateQueue } from './ReactFiberClassUpdateQueue'
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber'

/**
 * 根据新的虚拟dom生成新的fiber链表
 * @param {*} current 老的父fiber：const current = unitOfWork.alternate
 * @param {*} workInProgress 新的父fiber
 * @param {*} nextChildren 新的子虚拟dom
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果此新fiber没有老fiber，说明此新fiber是新创建的
  if (current === null) {
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

function updateHostComponent(current, workInProgress) {}

/**
 * 根据新虚拟dom去构建新的fiber子链表（child、child.slibing）
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @returns
 */
export function beginWork(current, workInProgress) {
  logger('beginWork', workInProgress)
  switch (workInProgress.tag) {
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
