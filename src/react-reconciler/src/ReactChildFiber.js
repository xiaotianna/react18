import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress
} from './ReactFiber'
import { ChildDeletion, Placement } from './ReactFiberFlags'
import isArray from 'shared/isArray'
import { HostText } from './ReactWorkTags'

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
   * 记录待删除的旧子 Fiber，同时需要在父fiber上添加deletions
   * @param {*} returnFiber 本轮正在构建的父 Fiber（workInProgress）
   * @param {*} childToDelete 需要删除的老的子节点
   */
  function deleteChild(returnFiber, childToDelete) {
    // 只在更新阶段才处理后续逻辑
    if (!shouldTrackSideEffects) {
      return
    }
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      returnFiber.deletions.push(childToDelete)
    }
  }

  // 删除currentFirstFiber之后所有的fiber节点，包括自己
  function deleteRemainingChildren(returnFiber, currentFirstFiber) {
    if (!shouldTrackSideEffects) {
      return
    }
    let childToDelete = currentFirstFiber
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
    return null
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
          // 优化：因为当前是单节点，新子元素只有一个，找到可复用节点后，其余旧兄弟必定都要删除
          deleteRemainingChildren(returnFiber, child.sibling)
          // 如果key一样、type也一样，则认为此节点可以复用
          const existing = useFiber(child, element.props)
          existing.return = returnFiber
          return existing
        } else {
          /**
           * 如果找到了key一样的老fiber，但类型不一样，需要删除自己和自己的兄弟
           * 和child.key === key执行deleteChild的区别是：
           * 1、首先是单节点diff，外层key不同，但是兄弟的key、type可能会相同，所以只删除自己
           * 2、deleteRemainingChildren是因为key、type都不相同了，而且key是唯一的，又是单节点，那兄弟肯定不同
           *    所以需要循环把兄弟都删除后，break
           */
          deleteRemainingChildren(returnFiber, child)
          break
        }
      } else {
        deleteChild(returnFiber, child)
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

  /**
   * 记录节点的新索引，判断它是否需要插入或移动，并返回供下一个节点比较的位置参照
   * @param {*} newFiber 本轮正在处理的 Fiber，可能是复用的，也可能是新建的
   * @param {*} lastPlacedIndex 前面已处理的复用节点中，最大的旧索引，用来判断旧节点的相对顺序有没有被打乱
   * @param {*} newIndex 它在新数组中的下标
   * @returns
   */
  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex
    }
    // 老fiber
    const current = newFiber.alternate
    // 如果有老fiber，表示这是一个更新的节点，有老的真实dom，就不需要插入了
    if (current !== null) {
      const oldIndex = current.index
      // 进行比较，返回大者
      if (oldIndex < lastPlacedIndex) {
        // 标记移动，说明它原来排在前面某个节点之前，现在却要排在那个节点之后
        // 没有专门的移动标识，对于老节点的插入来说，就是移动
        newFiber.flags |= Placement
        return lastPlacedIndex
      } else {
        // 复用旧fiber，并且顺序未改变
        return oldIndex
      }
    } else {
      // 没有旧 Fiber：标记插入
      // 如果一个fiber的flags上有Placement，说明此节点需要创建真实dom并且插入到父容器中
      // 如果父fiber节点是初次挂载，shouldTrackSideEffects为false，不需要添加flags
      // 这种情况下会在完成阶段把所有的子节点全部添加到自己身上
      newFiber.flags |= Placement
      return lastPlacedIndex
    }
  }

  /**
   * 比较 type，决定复用旧节点，还是新建节点
   * @param {*} returnFiber 这批子节点的父 Fiber
   * @param {*} current 当前这一对中的旧子 Fiber
   * @param {*} element 新的虚拟 DOM 元素
   * @returns
   */
  function updateElement(returnFiber, current, element) {
    const elementType = element.type
    if (current !== null) {
      // 旧 Fiber 存在，且 type 相同，可以复用老fiber和真实dom
      if (current.type === elementType) {
        const existing = useFiber(current, element.props)
        existing.return = returnFiber
        return existing
      }
    }
    // 旧 Fiber 不存在，或者 type 不同，创建全新节点的 Fiber
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  // 先比较 key，相同后再通过 updateElement 比较 type
  function updateSlot(returnFiber, current, newChild) {
    const key = current !== null ? current.key : null
    if (newChild !== null && typeof newChild === 'object') {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (newChild.key === key) {
            // 如果key一样，就进入更新元素的逻辑
            // 判断type是否一致，以及判断旧fiber是否存在，判断是复用，还是新创建fiber
            return updateElement(returnFiber, current, newChild)
          }
        }
        default:
          return null
      }
    }
    return null
  }

  /**
   * 遍历newChildren，创建子fiber，把它们连成兄弟链，最后返回第一个子 Fiber
   * @param {*} returnFiber workInProgress，也就是处理这批子fiber的父节点
   * @param {*} currentFirstChild 老fiber的第一个子fiber
   * @param {*} newChildren
   * @returns
   */
  function reconcileChildArray(returnFiber, currentFirstChild, newChildren) {
    // 返回的第一个新儿子
    let resultingFirstChild = null
    // 上一个的新fiber
    let previousNewFiber = null
    // 在FiberNode上的index字段，用来遍历新的虚拟dom的索引
    let newIdx = 0
    // 第一个老fiber
    let oldFiber = currentFirstChild
    // 下一个老fiber
    let nextOldFiber = null
    // 上一个不需要移动的老节点的索引（新旧索引比较大小，保留最大者即可）
    let lastPlacedIndex = 0

    // 第一轮遍历：按当前位置比较 key 和 type，key 相同则复用或替换，key 不同则立即停止，把剩余部分交给后面的 Map 逻辑。
    // 不负责跨位置查找和移动，交给后续逻辑处理
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      // 先暂存下一个老fiber
      nextOldFiber = oldFiber.sibling
      // 试图更新或复用老fiber
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx])
      if (newFiber === null) {
        break
      }
      // 更新时，进入此逻辑
      if (shouldTrackSideEffects) {
        // 旧节点还在，但本轮的新 Fiber 没有复用它，所以要把旧节点登记为待删除。
        // 老的真实dom会在后面的提交阶段会删除
        if (oldFiber && newFiber.alternate === null) {
          // 记录哪个旧节点需要删除
          deleteChild(returnFiber, oldFiber)
        }
      }
      // 记录新节点的位置，判断是否需要 Placement
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
      oldFiber = nextOldFiber
    }

    // 新的虚拟dom已经循环完了
    if (newIdx === newChildren.length) {
      // 删除剩下的老fiber
      deleteRemainingChildren(returnFiber, oldFiber)
      return resultingFirstChild
    }

    if (oldFiber === null) {
      // 第二轮遍历：如果老的fiber已经没有了，新的虚拟dom还有，把剩余新元素全部创建为 Fiber，接到新链表后面
      // 也就是进入插入新节点的逻辑
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx])
        if (newFiber === null) continue
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        if (previousNewFiber === null) {
          // 如果previousNewFiber为null，说明这是第一个fiber（大儿子）
          resultingFirstChild = newFiber
        } else {
          // 不是大儿子，就把newFiber添加到上一个子节点的后面（也就是上一个节点的兄弟节点）
          previousNewFiber.sibling = newFiber
        }
        previousNewFiber = newFiber
      }
    }

    // 开始处理移动的情况
    // 把剩余、尚未处理的旧 Fiber 放进 Map，方便第三轮根据 key 查找旧节点
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber)
    // 第三轮遍历：开始遍历剩下的虚拟dom子节点
    // 从 Map 中查找旧 Fiber，决定复用还是新建，再记录插入、移动等操作
    for (; newIdx < newChildren.length; newIdx++) {
      // 查找旧节点，决定复用或新建
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx]
      )
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          // 如果要跟踪副作用，并且有老fiber
          if (newFiber.alternate !== null) {
            // 将已经复用的旧节点从 Map 中移除
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key
            )
          }
        }
        // 指定新fiber的存放位置，并修改lastPlacedIndex的值
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        if (previousNewFiber === null) {
          // 如果previousNewFiber为null，说明这是第一个fiber（大儿子）
          resultingFirstChild = newFiber
        } else {
          // 不是大儿子，就把newFiber添加到上一个子节点的后面（也就是上一个节点的兄弟节点）
          previousNewFiber.sibling = newFiber
        }
        previousNewFiber = newFiber
      }
    }
    if (shouldTrackSideEffects) {
      // 等全部处理完成后，删除map中所有剩余的老fiber
      existingChildren.forEach((child) => deleteChild(returnFiber, child))
    }
    return resultingFirstChild
  }

  function updateTextNode(returnFiber, current, textContent) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent)
      created.return = returnFiber
      return created
    } else {
      const existing = useFiber(current, textContent)
      existing.return = returnFiber
      return existing
    }
  }

  // 查找旧节点，决定复用或新建
  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null
      return updateTextNode(returnFiber, matchedFiber, '' + newChild)
    }
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key
            ) || null
          return updateElement(returnFiber, matchedFiber, newChild)
        }
      }
    }
  }

  // 把剩余、尚未处理的旧 Fiber 放进 Map，方便第三轮根据 key 查找旧节点
  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map()
    let existingChild = currentFirstChild
    while (existingChild !== null) {
      // 如果有key使用key，没有key就使用索引
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild)
      } else {
        existingChildren.set(existingChild.index, existingChild)
      }
      existingChild = existingChild.sibling
    }
    return existingChildren
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
