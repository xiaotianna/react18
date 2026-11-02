# 21-useLayoutEffect

```js
// 在渲染阶段，这些 effect 已经准备好了
let effects = [
  {
    type: 'useEffect',
    create: 'useEffect1Create',
    destroy: 'useEffect1Destroy'
  },
  {
    type: 'useLayoutEffect',
    create: 'useLayoutEffect2Create',
    destroy: 'useLayoutEffect2Destroy'
  },
  {
    type: 'useEffect',
    create: 'useEffect3Create',
    destroy: 'useEffect3Destroy'
  },
  {
    type: 'useLayoutEffect',
    create: 'useLayoutEffect4Create',
    destroy: 'useLayoutEffect4Destroy'
  }
]
```

在渲染之后会进入 commit 提交阶段。commit阶段分为3个步骤：

1. commitBeforeMutationEffects dom变更前
2. commitMutationEffects dom变更
3. commitHookLayoutEffects dom变更后

然后就是commit完成后

---

首次挂载的时候：

- `commitHookLayoutEffects` 同步执行 `useLayoutEffect2Create` 和 `useLayoutEffect4Create`。
- 在下一个宏任务中，异步执行 `useEffect1Create` 和 `useEffect3Create`。

更新的时候：

1. 先在 `commitMutationEffects` 中同步执行 `useLayoutEffect2Destroy` 和 `useLayoutEffect4Destroy`。
2. 紧接着在 `commitHookLayoutEffects` 中同步执行 `useLayoutEffect2Create` 和 `useLayoutEffect4Create`。
3. 在下一个宏任务中，异步执行 `useEffect1Destroy` 和 `useEffect3Destroy`。
4. 随后异步执行 `useEffect1Create` 和 `useEffect3Create`。

## 源码变更

### `src/react-reconciler/src/ReactFiberHooks.js`

添加hook的mount和update

### `src/react-reconciler/src/ReactFiberWorkLoop.js`

在 `commitRoot` 的 `commitMutationEffectsOnFiber` 的dom变更后添加 `commitLayoutEffects`，来执行 `layoutEffect`（这个方法在 `src/react-reconciler/src/ReactFiberCommitWork.js`）

- `commitMutationEffectsOnFiber` 中是执行layoutEffect的销毁回调（commitHookEffectListUnmount）

  > `useEffect` 的清理函数和回调，都在异步调度的 `flushPassiveEffect` 中处理

- `commitLayoutEffects` 中是执行layoutEffect的创建函数
