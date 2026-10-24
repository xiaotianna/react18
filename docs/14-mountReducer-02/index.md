# 14-mountReducer-02

## ReactFiberHooks.js

从 `src/react-reconciler/src/ReactFiberHooks.js` 开始，处理 `useReducer` 的action，也就是`dispatchReducerAction`

```text
enqueueConcurrentHookUpdate(...)
  → 暂存更新对象，找到所属的 FiberRoot

scheduleUpdateOnFiber(root)
  → scheduleCallback(...)
  → requestIdleCallback(...) 安排稍后执行
  → renderRootSync(root) 构建新的 Fiber 树
  → commitRoot(root) 将变化提交到真实 DOM
  → 浏览器绘制更新后的界面
```

## ReactFiberWorkLoop.js

然后是 `src/react-reconciler/src/ReactFiberWorkLoop.js` 中的 `prepareFreshStack` 方法的 `finishQueueingConcurrentUpdates`

`finishQueueingConcurrentUpdates` 会把暂存的更新放进各自 Hook 的队列

你调用 dispatch 时，更新先暂存在公共数组里：

```js
concurrentQueue = [
  fiber,
  queue,
  update,
  fiber,
  queue,
  update
  // ...
]
```

存入 `concurrentQueue` 的时机是调用 `dispatch(action)` 时，更新的时候执行`finishQueueingConcurrentUpdates`

完整流程：

```text
dispatch(action)
  → 更新暂存到 concurrentQueue
  → scheduleUpdateOnFiber(root) 安排渲染
  → 渲染任务开始
  → prepareFreshStack(root)
  → finishQueueingConcurrentUpdates()
  → 更新进入各自 Hook 的 queue.pending
  → 后续遍历 Fiber、渲染组件
```
