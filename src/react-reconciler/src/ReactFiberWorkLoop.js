import { scheduleCallback } from 'scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'

// 当前正在处理的 Fiber 节点；没有工作时为 null
let workInProgress = null

/**
 * 计划更新root
 * 在源码中此处有一个任务的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root) {
  // 确保调度执行root上的更新
  ensureRootIsscheduled(root)
}

function ensureRootIsscheduled(root) {
  // 告诉浏览器需要执行performConcurrentWorkOnRoot
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root))
}

/**
 * 根据fiber构建fiber树，要创建真实dom节点，还要把真实dom节点插入容器
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root) {
  // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步的（为了保证初始化加载的完整）
  renderRootSync(root)
}

function renderRootSync(root) {
  // 开始构建fiber树
  prepareFreshStack(root)
  workLoopSync()
}

function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null)
  console.log(workInProgress)
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

/**
 * 执行一个工作单元
 * @param {*} unitOfWork
 */
function performUnitOfWork(unitOfWork) {
  // unitOfWork -> workInProgress，也就是新fiber
  // unitOfWork.alternate就是指向老fiber
  const current = unitOfWork.alternate
  // 完成当前fiber的子fiber链表构建后
  const next = beginWork(current, unitOfWork)
  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    // 如果没有子节点，表示当前fiber已经完成
    completeUnitOfWork(unitOfWork)
  } else {
    // 如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next
  }
}

/**
 * 执行当前 Fiber 的完成工作，并确定下一个工作单元。
 * 1、先执行当前 Fiber 的 completeWork。
 * 2、有兄弟 Fiber，则将其设为下一个工作单元，后续执行 beginWork。
 * 3、没有兄弟 Fiber，说明父 Fiber 的所有子 Fiber 均已完成，
 *    向上执行父 Fiber 的 completeWork，并重复上述过程。
 * 4、回溯到根 Fiber 并完成后，结束本轮遍历。
 * @param {*} unitOfWork 待执行完成工作的 Fiber
 * @returns {void}
 */
function completeUnitOfWork(unitOfWork) {
  // 已完成的工作单元
  let completedWork = unitOfWork
  do {
    // 当前fiber的老fiber
    const current = completedWork.alternate
    // 当前fiber的父fiber
    const returnFiber = completedWork.return
    // 执行此fiber的完成工作，如果是原生组件的话就是创建真实dom组件
    completeWork(current, completedWork)
    // 已经完成工作的fiber，需要找他的兄弟fiber
    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      // 如果有兄弟fiber，就构建兄弟所对应的fiber子链表
      workInProgress = siblingFiber
      return
    } else {
      // 如果没有兄弟，就说明当前完成的就是父fiber的最后一个节点
      // 也就是说一个父fiber的所有子fiber都已经全部完成
      completedWork = returnFiber
      workInProgress = completedWork
    }
  } while (completedWork !== null)
}
