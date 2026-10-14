import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { createFiberFromElement } from './ReactFiber'
import { Placement } from './ReactFiberFlags'

/**
 * 工厂方法：是否跟踪副作用
 * @param {*} shouldTrackSideEffects
 */
function createChildReconciler(shouldTrackSideEffects) {
  /**
   * 根据单个虚拟dom创建fiber，并让它指向父fiber，最后返回该fiber
   * @param {*} returnFiber 新的父fiber（workInProgress）
   * @param {*} currentFirstFiber 老fiber的第一个子fiber
   * @param {*} element 虚拟dom element
   * @returns
   */
  function reconcileSingleElement(returnFiber, currentFirstFiber, element) {
    // 初次挂载，老节点currentFirstFiber是没有的，所以可以直接根据虚拟dom创建新的fiber节点
    // 也就是把虚拟 DOM element 转换成新的 Fiber 节点
    const created = createFiberFromElement(element)
    // 把新fiber节点的return指向父fiber
    // 实现的是【docs/05-beginWork-02/image.png】中的h1的return指向HostRootFiber
    created.return = returnFiber
    return created
  }

  /**
   * 设置副作用（增删改）
   * @param {*} newFiber
   */
  function placeSingleChild(newFiber) {
    // 为true说明要添加副作用
    if (shouldTrackSideEffects) {
      // 要在最后的提交阶段插入此节点
      // react渲染分成渲染（创建fiber树）和提交（更新真实dom->增删改）两个阶段
      newFiber.flags |= Placement
    }
    return newFiber
  }

  /**
   * 比较子fiber（dom diff），就是用老的子fiber链表和新的虚拟dom进行比较的过程
   * @param {*} returnFiber 新的父fiber（workInProgress）
   * @param {*} currentFirstFiber 老fiber的第一个子fiber（current在这个源码中指的是老的fiber）
   * @param {*} newChild 新的子虚拟dom
   */
  function reconcileChildFibers(returnFiber, currentFirstFiber, newChild) {
    // 暂时只考虑新的节点只有一个的情况
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstFiber, newChild)
          )
        default:
          break
      }
    }
  }
  return reconcileChildFibers
}

// 如果没有父fiber，初次挂载时使用
export const mountChildFibers = createChildReconciler(false)
// 有老fiber更新时候使用
export const reconcileChildFibers = createChildReconciler(true)
