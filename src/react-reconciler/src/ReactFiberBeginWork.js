import { logger } from "shared/logger";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";

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
    const nextChildren = nextState.element
    // 协调子节点（包含dom diff算法）
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
