# 25-lane并发更新渲染

上一节中，lane初次渲染的时候，lane赛道是16。

更新渲染分为同步渲染和异步渲染

这次的更改主要是两部分：分别是hook的修改，以及workLoop的修改，都添加了异步渲染的逻辑

## hook的修改

### 1、`src/react-reconciler/src/ReactFiberHooks.js` 的 `dispatchSetState`

在之前的基础上，添加了判断的逻辑，只有判断是否有lane才执行

### 2、`src/react-dom-bindings/src/events/ReactDOMEventListener.js` 的 `dispatchDiscreteEvent`

添加触发离散事件，需要设置优先级

## requestIdleCallback 的 polyfill

在 `src/scheduler/src/forks/Scheduler.js` 中，由几个函数共同完成。

1. 判断时间是否用完：`shouldYield`

2. 时间到了就退出任务循环：`workLoop`

```js
if (currentTask.expirationTime > currentTime && shouldYield()) {
  break
}
```

3. 没做完就安排下一轮：`performWorkUntilDeadline`

```js
frameStartTime = currentTime
// ...
hasMoreWork = workLoop(currentTime)
// ...
if (hasMoreWork) {
  schedulePerformWorkUntilDeadline()
}
```

记录本轮开始时间，执行任务；还有任务就发消息安排下一轮，然后退出当前调用，把主线程交还给浏览器。

但 React 的渲染任务内部也得配合暂停。 对应的是 [`workLoopConcurrent`](react-reconciler/src/ReactFiberWorkLoop.js)

```js
while (workInProgress !== null && !shouldYield()) {
  performUnitOfWork(workInProgress)
}
```

整体流程：每处理完一个 Fiber，再检查时间；时间到了，就停在当前进度，后面继续。

```text
消息触发本轮执行
    ↓
记录开始时间
    ↓
处理 Fiber，每次检查 shouldYield()
    ↓
时间片用完，保留进度
    ↓
安排下一轮并退出
    ↓
浏览器有机会处理其他工作
    ↓
下一轮继续
```

## `src/react-reconciler/src/ReactFiberWorkLoop.js`

这个文件主要是在之前的同步逻辑的基础上，添加了异步调度的逻辑
