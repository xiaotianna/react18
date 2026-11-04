# 23-lane更新优先级

react有三套优先级

1. 车道优先级：`src/react/packages/react-reconciler/src/ReactFiberLane.js`
2. 事件优先级：`src/react/packages/react-reconciler/src/ReactEventPriorities.old.js`

```js
export const DiscreteEventPriority = SyncLane
export const ContinuousEventPriority = InputContinuousLane
export const DefaultEventPriority = DefaultLane
export const IdleEventPriority = IdleLane
```

3. scheduler优先级：`src/react/packages/scheduler/src/SchedulerPriorities.js`

具体的 lane 优先级可以参考 `./lane-updateQueue.js` 的 `processUpdateQueue`。简单说：每次渲染只处理一个优先级档位，代码里用 `isSubSetOfLanes` 判断每条更新属不属于这次渲染。属于的执行；不属于的先跳过，留在队列里。等这轮渲染完、高优先级被清掉，下一轮就轮到低优先级，把跳过的补上。两个要点：一是只要跳过了一条，后面的更新即使优先级够也得跟着留着，否则状态就断了；二是优先级本身没变，只是高的先算完、低的后算。比如点击的更新先出结果，普通 setState 的下一轮再补。

然后就是还有一个“饥饿”问题“：

> 如果低优先级更新不断被高优先级插队，它可能永远轮不到。React 的解法是过期时间（markStarvedLanesAsExpired）：一条 lane pending 太久（默认 5000ms）会被标记为 expired，getNextLanes 会把 expired 的 lane 提到同步优先级强制执行。所以“都会执行到”是有保证的——不是靠优先级衰减，而是靠这套过期兜底。（后续会说）
