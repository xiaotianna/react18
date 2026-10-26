import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress
} from './ReactFiber'
import { Placement } from './ReactFiberFlags'
import isArray from 'shared/isArray'

/**
 * 工厂方法：是否跟踪副作用
 * @param {*} shouldTrackSideEffects
 */
function createChildReconciler(shouldTrackSideEffects) {
  /**
   * 准备本轮的工作 Fiber
   * @param {*} fiber 
   * @param {*} pendingProps 
   * @returns 
   */
  function useFiber(fiber, pendingProps) {
    // 基于旧 Fiber 获取本轮的工作 Fiber
    const clone = createWorkInProgress(fiber, pendingProps)
    clone.index = 0
    clone.sibling = null
    return clone
  }

  /**
   * 根据单个虚拟dom创建fiber，并让它指向父fiber，最后返回该fiber
   * @param {*} returnFiber 新的父fiber（workInProgress）
   * @param {*} currentFirstFiber 老fiber的第一个子fiber
   * @param {*} element 虚拟dom element
   * @returns 返回的第一个新子fiber
   */
  function reconcileSingleElement(returnFiber, currentFirstFiber, element) {
    // 更新时，根据新元素的 key 和 type，查找并复用旧 Fiber
    // 新的虚拟dom key，唯一标识
    const key = element.key
    let child = currentFirstFiber
    // 【docs/15-updateReducer/image.png】中对应的判断逻辑
    while (child !== null) {
      // 判断老fiber对应的key与虚拟dom对应的key是否一样
      if (child.key === key) {
        // 判断老fiber对应的类型与虚拟dom对应的类型是否一样
        if (child.type === element.type) {
          // 如果key一样、type也一样，则认为此节点可以复用
          const existing = useFiber(child, element.props)
          existing.return = returnFiber
          return existing
        }
      }
      child = child.sibling
    }
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
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      // 要在最后的提交阶段插入此节点
      // react渲染分成渲染（创建fiber树）和提交（更新真实dom->增删改）两个阶段
      newFiber.flags |= Placement
    }
    return newFiber
  }

  function createChild(returnFiber, newChild) {
    // 纯文本
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      const created = createFiberFromText(`${newChild}`)
      created.return = returnFiber
      return created
    }
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild)
          created.return = returnFiber
          return created
        }
        default:
          break
      }
    }
  }

  function placeChild(newFiber, newIndex) {
    newFiber.index = newIndex
    if (shouldTrackSideEffects) {
      // 如果一个fiber的flags上有Placement，说明此节点需要创建真实dom并且插入到父容器中
      // 如果父fiber节点是初次挂载，shouldTrackSideEffects为false，不需要添加flags
      // 这种情况下会在完成阶段把所有的子节点全部添加到自己身上
      newFiber.flags |= Placement
    }
  }

  /**
   * 遍历newChildren，创建子fiber，把它们连成兄弟链，最后返回第一个子 Fiber
   * @param {*} returnFiber
   * @param {*} currentFirstFiber
   * @param {*} newChildren
   * @returns
   */
  function reconcileChildArray(returnFiber, currentFirstFiber, newChildren) {
    // 返回的第一个新儿子
    let resultingFirstChild = null
    // 上一个的新fiber
    let previousNewFiber = null
    // 在FiberNode上的index字段
    let newIndex = 0
    for (; newIndex < newChildren.length; newIndex++) {
      const newFiber = createChild(returnFiber, newChildren[newIndex])
      if (newFiber === null) continue
      placeChild(newFiber, newIndex)
      if (previousNewFiber === null) {
        // 如果previousNewFiber为null，说明这是第一个fiber（大儿子）
        resultingFirstChild = newFiber
      } else {
        // 不是大儿子，就把newFiber添加到上一个子节点的后面（也就是上一个节点的兄弟节点）
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
    }
    return resultingFirstChild
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
    // 如图【docs/06-beginWork-03/image.png】，针对于h1节点，newChildren是数组
    // 不是单节点就进入不了上面的判断（typeof newChild === 'object' && newChild !== null）
    if (isArray(newChild)) {
      return reconcileChildArray(returnFiber, currentFirstFiber, newChild)
    }
    return null
  }
  return reconcileChildFibers
}

// 如果没有父fiber，初次挂载时使用
export const mountChildFibers = createChildReconciler(false)
// 有老fiber更新时候使用
export const reconcileChildFibers = createChildReconciler(true)
