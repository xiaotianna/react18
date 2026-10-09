import { createHostRootFiber } from './ReactFiber'
import { initialUpdateQueue } from './ReactFiberClassUodateQueue'

function FiberRootNode(containerInfo) {
  // 外部createRoot传递的容器信息，也就是 div#root 这个dom节点
  this.containerInfo = containerInfo
}

// 创建根Fiber（FiberRootNode）
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
