import { HostRoot } from './ReactWorkTags'

/**
 * 此方法需要处理更新优先级的问题，目前只实现向上冒泡找到根节点
 */
export function markUpdateLaneFromFiberToRoot(sourceFiber) {
  // 当前fiber
  let node = sourceFiber
  // 当前fiber的父fiber
  let parent = sourceFiber.return
  while (parent !== null) {
    node = parent
    parent = parent.return
  }
  // 一直找到parent为null，也就是HostRootFiber
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}
