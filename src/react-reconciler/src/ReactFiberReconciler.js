import { createUpdate, enqueueUpdate } from './ReactFiberClassUpdateQueue'
import { createFiberRoot } from './ReactFiberRoot'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'

// 创建内部根：FiberRootNode（通过createFiberRoot创建）
export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo)
}

/**
 * 更新容器，把虚拟dom element变成真实dom插入到container中
 * @param {*} element 虚拟dom
 * @param {*} container 真实dom容器 FiberRootNode -> div#root
 */
export function updateContainer(element, container) {
  // 获取当前的根fiber：HostRootFiber
  const current = container.current
  // 创建更新
  const update = createUpdate()
  // 要更新的虚拟dom
  /**
   * update描述一次更新，payload保存这次更新需要修改的数据
   * ❓至于为什么update是对象？因为update是一个链表，结构是：
   *  const update = {
        payload: { element }, // 本次更新的数据
        next: null           // 指向下一个更新
      }
   */
  update.payload = { element }
  // 把此更新对象添加到current这个根fiber的更新队列上
  const root = enqueueUpdate(current, update)
  scheduleUpdateOnFiber(root)
}
