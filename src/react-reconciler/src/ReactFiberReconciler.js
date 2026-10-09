import { createFiberRoot } from './ReactFiberRoot'

// 创建内部根：FiberRootNode（通过createFiberRoot创建）
export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo)
}
