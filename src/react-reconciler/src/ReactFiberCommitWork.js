import {
  appendChild,
  insertBefore
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { MutationMask, Placement } from './ReactFiberFlags'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags'

/**
 * 递归遍历子树，处理后代 Fiber 的 mutation 副作用
 * @param {*} root FiberRoot 对象
 * @param {*} parentFiber 当前遍历的父 Fiber
 */
function recursivelyTraverseMutaionsEffects(root, parentFiber) {
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
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostComponent:
    case HostText:
      // 遍历它们的子节点，处理它们子节点上的副作用
      recursivelyTraverseMutaionsEffects(root, finishedWork)
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork)
      break
    default:
      break
  }
}
