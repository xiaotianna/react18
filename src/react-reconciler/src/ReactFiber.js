import { NoFlags } from './ReactFiberFlags'
import { HostComponent, HostRoot, HostText, IndeterminateComponent } from './ReactWorkTags'

/**
 * @param {*} tag fiber的类型：函数组件（0）、类组件（1）、原生组件（5）、根元素（3）
 * @param {*} pendingProps 新属性：等待处理/等待生效的属性
 * @param {*} key 唯一标识
 */
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag
  this.key = key
  // fiber类型，来自虚拟dom节点的type，例如div、span
  this.type = null
  // 此fiber对应的真实dom节点，从HostRootFiber.stateNode -> FiberRootNode可以看出
  // 每个虚拟dom -> 一个fiber节点 -> 真实dom
  this.stateNode = null

  // 指向父节点
  this.return = null
  // 指向第一个子节点
  this.child = null
  // 指向兄弟节点
  this.sibling = null
  // 该 Fiber 在父节点 children 中的位置，也就是sibling的索引
  this.index = 0

  // 虚拟dom会提供pendingProps用来创建fiber节点的属性，处理后赋值给memoizedProps（双缓冲结构）
  // 等待生效的属性
  this.pendingProps = pendingProps
  // 已经生效的属性
  this.memoizedProps = null

  // 每个fiber还有自己的状态，每种fiber状态存的类型是不一样的
  // 类组件对应的fiber存的就是类的实例的状态，HostRoot存的就是要渲染的元素
  this.memoizedState = null

  // 每个fiber上可能还有更新队列
  this.updateQueue = null

  // flags：副作用标识，表示要针对此fiber节点进行何种操作
  this.flags = NoFlags
  // 子节点对应的副作用标识
  // 作用：性能优化，react执行分两个阶段：1、render计算副作用 2、commit修改真实dom，或者说提交副作用
  // 如果subtreeFlags为0，那就证明子节点处理完成，不需要进行递归遍历了
  this.subtreeFlags = NoFlags
  // 轮替作用，供双缓冲中使用（dom diff部分）
  this.alternate = null
}

export function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key)
}

export function createHostRootFiber() {
  return createFiber(HostRoot, null, null)
}

/**
 * 基于老的fiber和新的属性来创建新的fiber
 * @param {*} current 老fiber
 * @param {*} pendingProps 新属性
 */
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate
  if (workInProgress === null) {
    // 创建新的fiber
    workInProgress = createFiber(current.tag, pendingProps, current.key)
    workInProgress.type = current.type
    workInProgress.stateNode = current.stateNode
    // 双向指向，对应【docs/04-beginWork/image2.png】alternate 的连接部分
    workInProgress.alternate = current // 新的指向老的fiber
    current.alternate = workInProgress // 老的指向新的
  } else {
    // 更新
    workInProgress.pendingProps = pendingProps
    workInProgress.type = current.type
    // 赋值为NoFlags是因为：是准备本次更新，先清空旧标记，还没开始比较新旧内容。
    // else 表示已有 current.alternate，可以复用这个 Fiber 对象。
    // 它可能保留着上一次渲染的标记，所以需要重置
    workInProgress.flags = NoFlags
    workInProgress.subtreeFlags = NoFlags
  }
  /**
   * 这里不需要处理父节点return，由后续“连接父子节点”的代码设置
   * 例如：
   *  const newChild = createWorkInProgress(currentChild, newProps)
      newChild.return = parentWorkInProgress
   */
  workInProgress.child = current.child
  workInProgress.sibling = current.sibling
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.memoizedState = current.memoizedState
  workInProgress.updateQueue = current.updateQueue
  workInProgress.index = current.index

  return workInProgress
}

/**
 * 根据虚拟dom创建fiber节点
 * @param {*} element
 */
export function createFiberFromElement(element) {
  const { type, key, props: pendingProps } = element
  return createFiberFromTypeAndProps(type, key, pendingProps)
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  let tag = IndeterminateComponent
  // 如果type类型是字符串，说明此fiber是一个原生组件
  if (typeof type === 'string') {
    tag = HostComponent
  }
  const fiber = createFiber(tag, pendingProps, key)
  fiber.type = type
  return fiber
}

export function createFiberFromText(content) {
  return createFiber(HostText, content, null)
}
