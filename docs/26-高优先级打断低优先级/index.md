# 26-高优先级打断低优先级

这次的更改主要是对之前的逻辑做一些微小处理，就一个方法的逻辑改变： `src/react-reconciler/src/ReactFiberWorkLoop.js` 的 `ensureRootIsscheduled` 方法

1. 优先级相同，复用已有任务：

```js
// 获取新的调度优先级，仍然是lane值
let newCallbackPriority = getHighestPriorityLane(nextLanes)
// 获取现在根上正在运行的优先级
const existingCallbackPriority = root.callbackPriority
if (existingCallbackPriority === newCallbackPriority) {
  // 如果新的优先级和老的优先级一样，可以进行批量更新
  // 也就是多次setState，会合并成一次的原理（同步添加任务，异步调用处理任务）
  return
}
```

2. 优先级不同，取消旧任务：取消的逻辑就是把这个callback设置为null

```js
if (existingCallbackNode !== null) {
  Scheduler_cancelCallback(existingCallbackNode)
}
```

先取消旧任务，然后再安排新任务：

- 同步优先级走 `scheduleSyncCallback`
- 其他优先级走 `Scheduler_scheduleCallback`

最后记录本次安排的：

```js
root.callbackNode = newCallbackNode
root.callbackPriority = newCallbackPriority
```
