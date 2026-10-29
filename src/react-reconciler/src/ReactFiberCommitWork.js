import {
  appendChild,
  insertBefore,
  commitUpdate,
  removeChild
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { MutationMask, Placement, Update } from './ReactFiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText
} from './ReactWorkTags'

// 真实dom节点的父节点
let hostParent = null

/**
 * 提交删除副作用
 * @param {*} root 根节点
 * @param {*} returnFiber 父fiber，但实际的参数却是当前fiber
 * @param {*} deletedFiber 删除的fiber
 */
function commitDeletionEffects(root, returnFiber, deletedFiber) {
  let parent = returnFiber
  // 一直向上查找，找到真实dom节点为止
  findParent: while (parent !== null) {
    switch (parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode
        break findParent
      }
      case HostRoot: {
        hostParent = parent.stateNode.containerInfo
        break findParent
      }
    }
    parent = parent.return
  }
  // 处理传入的旧 Fiber 的删除
  commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber)
  hostParent = null
}

function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAnceston,
  deletedFiber
) {
  switch (deletedFiber.tag) {
    case HostComponent:
    case HostText: {
      // 当要删除一个节点的时候，要先删除它的子节点
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAnceston,
        deletedFiber
      )
      // 再删除自己
      if (hostParent !== null) {
        removeChild(hostParent, deletedFiber.stateNode)
      }
      break
    }
    default:
      break
  }
}

/**
 * 递归遍历删除副作用
 * @param {*} finishedRoot
 * @param {*} nearestMountedAnceston
 * @param {*} parent
 */
function recursivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAnceston,
  parent
) {
  let child = parent.child
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAnceston, child)
    child = child.sibling
  }
}

/**
 * 先处理当前 Fiber 记录的子节点删除任务，
 * 再根据 subtreeFlags 按需递归遍历子树，处理后代 Fiber 的 mutation 副作用
 * @param {*} root FiberRoot 对象
 * @param {*} parentFiber 当前遍历的 Fiber（这里虽然是叫parentFiber，但是传入的是finishedWork，并非finishedWork.return）
 */
function recursivelyTraverseMutaionsEffects(root, parentFiber) {
  const deletions = parentFiber.deletions
  // 先处理当前 Fiber 记录的待删除子节点
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i]
      commitDeletionEffects(root, parentFiber, childToDelete)
    }
  }
  // 子树存在 MutationMask 包含的副作用时，继续遍历
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber
    while (child !== null) {
      // 递归（遍历fiber树，执行fiber上的副作用）
      commitMutationEffectsOnFiber(child, root)
      child = child.sibling
    }
  }
}

/**
 * 处理当前 Fiber 的插入或移动副作用，并清除 Placement 标记。
 * @param {*} finishedWork 当前已完成的 Fiber
 */
function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork
  // 如果此fiber要进行插入操作
  if (flags & Placement) {
    // 进行插入操作，也就是把此fiber对应的真实dom节点添加到父真实dom节点上
    commitPlacement(finishedWork)
    // 把flags里的Placement去掉
    finishedWork.flags & ~Placement
  }
}

function getHostParentFiber(fiber) {
  let parent = fiber.return
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
  parent
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot // div#root
}

/**
 * 把此fiber的真dom插入到父dom里
 * @param {*} finishedWork
 */
function commitPlacement(finishedWork) {
  let parentFiber = getHostParentFiber(finishedWork)
  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo
      // 获取最近兄弟的真实dom节点
      const before = getHostSibling(finishedWork)
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break
    }
    case HostComponent: {
      const parent = parentFiber.stateNode
      const before = getHostSibling(finishedWork)
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break
    }
    default:
      break
  }
}

/**
 * 找到要插入的锚点
 * 用来找到当前节点应该插入到哪个已有 DOM 节点的前面，保证最终的 DOM 顺序正确。
 * @param {*} fiber
 */
function getHostSibling(fiber) {
  let node = fiber
  // siblings: js的标签语句
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null
      }
      node = node.return
    }
    node = node.sibling
    // 如果兄弟不是原生节点，也不是文本节点
    while (node.tag !== HostComponent && node.tag !== HostText) {
      // 如果此节点是一个将要拆入的新的节点，找它的兄弟
      if (node.flags & Placement) {
        // 继续siblings标签的外层循环内容
        continue siblings
      } else {
        node = node.child
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode
    }
  }
}

/**
 * 把子节点对应的真实dom插入到父节点dom中
 * @param {*} node 将要拆入的fiber节点
 * @param {*} before
 * @param {*} parent 父真实dom节点
 */
function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node
  // 判断此fiber对应的节点是不是真实dom节点
  const isHost = tag === HostComponent || tag === HostText
  // 如果是就直接插入
  if (isHost) {
    const { stateNode } = node
    if (before) {
      insertBefore(parent, stateNode, before)
    } else {
      appendChild(parent, stateNode)
    }
  } else {
    // 如果node不是真实dom节点，就获取子节点
    const { child } = node
    if (child !== null) {
      // 把child添加到父dom节点中去（递归）
      insertOrAppendPlacementNode(child, before, parent)
      let { sibling } = child
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent)
        sibling = sibling.sibling
      }
    }
  }
}

/**
 * 遍历fiber树，执行fiber上的副作用
 * @param {*} finishedWork fiber节点
 * @param {*} root 根节点
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  // 当前fiber的老fiber
  const current = finishedWork.alternate
  const flags = finishedWork.flags
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostText:
      // 遍历它们的子节点，处理它们子节点上的副作用
      recursivelyTraverseMutaionsEffects(root, finishedWork)
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork)
      break
    case HostComponent:
      // 这两步和上面一样，只是原生节点需要需要dom的更新
      recursivelyTraverseMutaionsEffects(root, finishedWork)
      commitReconciliationEffects(finishedWork)
      // DOM更新，在【CompleteWork】的updateHostComponent中，添加了markUpdate，就能判断是否有Update
      // 完成阶段：发现属性差异 → 保存清单 → 标记 Update
      // 提交阶段：发现 Update → 取出清单 → 更新 DOM
      if (flags & Update) {
        // 获取真实dom
        const instance = finishedWork.stateNode
        // 更新真实dom
        if (instance !== null) {
          const newProps = finishedWork.memoizedProps
          const oldProps = current !== null ? current.memoizedProps : newProps
          const type = finishedWork.type
          // 原生组件的更新队列中存放的是待更新的属性
          const updatePayload = finishedWork.updateQueue
          finishedWork.updateQueue = null
          if (updatePayload) {
            commitUpdate(
              instance,
              updatePayload,
              type,
              oldProps,
              newProps,
              finishedWork
            )
          }
        }
      }
      break
    default:
      break
  }
}
