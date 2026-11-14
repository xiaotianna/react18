# 28-解决饥饿问题

饥饿问题就是如果当高优先级任务一直抢占更新，那么低优先级任务永远不可能得到执行，最后会过期掉

关于过期，有两套处理逻辑：一套在react模块中，一套在scheduler模块中

饥饿问题在react模块中解决，解决方法是：如果有低优先级赛道过期了，就会立刻把任务执行从异步改为同步

> ⚠️注意：代码判断的是已经过期，不是“快过期“

过程：

```text
setTimeout 安排回调
↓
等主线程有机会执行这个回调
↓
未过期：做一段，暂停，再安排下一次定时器
已过期：这次开始后，连续完成剩余渲染，不再分片
```

## 同步和异步

目前这里的异步执行，不是说像promise的那种异步，应该是是否允许分片执行，也就是并发执行。

核心区别就是是否允许分片。 更准确的名称是“同步渲染”和“并发渲染”

- 并发渲染循环（`workLoopConcurrent`）：检查时间，允许暂停

```js
while (workInProgress !== null && !shouldYield())
```

- 同步渲染循环（`workLoopSync`）：持续处理，直到完成

```js
while (workInProgress !== null)
```

而外层通过定时器、`MessageChannel` 安排稍后执行，叫异步调度。异步调度的回调里，两种渲染方式都可以使用。所以和异步执行不要混淆了

> 异步逻辑在 `Scheduler.js` 中

## 源码更改

### 1、`src/react-reconciler/src/ReactFiberWorkLoop.js`

该文件的主要修改就是“打补丁”，把这些关于lane赛道的内容进行处理，例如赛道是否过期，以及执行完成了的更新赛道需要清除

### 2、`src/react-reconciler/src/ReactFiberHooks.js`

主要是对 `updateReducer` 的更改，新增按 lane 分批处理更新的能力，并保存“断点信息”，让剩余更新下次能够正确重算。

这个断点信息就是指：例如我的更新是abc，但是b的优先级低，会被跳过，那么这个第一个跳过的更新，就是断点，信息包含：state、updateQueue。

假设同一个 Hook 的更新入队顺序是 A → B → C，但 B、C 优先级更高，那么：

- 本轮：跳过 A，先执行 B、C
- 保留：A 之前的 state，以及更新队列 [A, B, C]
- 后续处理 A 时：从保存的 state 开始，按 A → B → C 重新计算
