import { createHostRootFiber } from './ReactFiber'
import { initialUpdateQueue } from './ReactFiberClassUpdateQueue'
import { NoLanes } from './ReactFiberLane'

function FiberRootNode(containerInfo) {
  // 外部createRoot传递的容器信息，也就是 div#root 这个dom节点
  this.containerInfo = containerInfo
  // 记录这个根节点下，哪些 lane 上还有更新等待处理
  this.pendingLanes = NoLanes
}

// 创建根Fiber（FiberRootNode）
// FiberRoot是一个真实的dom节点，RootFiber是Fiber树的根节点
export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo)

  // 创建一个未初始化的fiber，HostRoot指的就是根节点div#root
  // 也就是 [docs/02-创建FiberRoot/image.png] 图中说描述的
  const uninitializedFiber = createHostRootFiber()
  // 根容器的current会指向当前根fiber
  root.current = uninitializedFiber
  // 根fiber的stateNode，也就是真实DOM节点会指向FiberRootNode
  uninitializedFiber.stateNode = root
  // 初始化更新队列
  initialUpdateQueue(uninitializedFiber)
  return root
}
