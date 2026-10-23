# 13-mountReducer

## 1、ReactFiberHooks

先看 `src/react-reconciler/src/ReactFiberHooks.js` 的部分，需要先清楚不同fiber的state是不一样的，函数组件的fiber对应的就是hooks链表的头部

这里要区分两个位置：

- currentRenderingFiber.memoizedState：保存链表的头节点。
- workInProgressHook：指向当前已创建的最后一个 Hook。

假设组件里调用了两次：

```js
const [count, dispatchCount] = useReducer(reducer, 0)
const [age, dispatchAge] = useReducer(reducer, 18)
```

每次都会通过 mountReducer 调用这个函数。

- 第一次调用：创建 Hook1

```js
const hook = {
  memoizedState: null,
  queue: null,
  next: null
}
```

此时还没有 Hook，因此进入：

```js
if (workInProgressHook === null) {
  workInProgressHook = hook
  currentRenderingFiber.memoizedState = hook
}
```

两个引用都指向 Hook1：

```js
Fiber.memoizedState ──→ Hook1
                         ↑
                  workInProgressHook
```

- 第二次调用：创建 Hook2

此时 workInProgressHook 已经指向 Hook1，进入 else：

```js
workInProgressHook.next = hook
```

先把 Hook1 和新建的 Hook2 连起来：

```js
Fiber.memoizedState ──→ Hook1 ──→ Hook2
                         ↑
                  workInProgressHook
```

再执行：

```js
workInProgressHook = hook
```

把指针移动到 Hook2：

```js
Fiber.memoizedState ──→ Hook1 ──→ Hook2
                                   ↑
                            workInProgressHook
```

## 2、src/react/src/ReactHooks.js

`src/react/src/ReactHooks.js` 与上面的 `ReactFiberHooks.js` 是如何建立联系的：

是通过 共享的 ReactCurrentDispatcher 对象关联起来。

`ReactHooks.js` 提供组件调用的 useReducer 入口，`ReactFiberHooks.js` 提供具体实现。

### 过程

1. 当外部调用 `useReducer` 的时候，其实是调用的 `src/react/src/ReactHooks.js` 中的 `useReducer`。

2. 其中通过 `resolveDispatcher` 方法的 `ReactCurrentDispatcher.current` 再 `.useReducer(xxx, xxx)`

3. 这个 `.useReducer` 就会在函数组件调用前执行：`ReactCurrentDispatcher.current = HooksDispatcherOnMount`（这个在`src/react-reconciler/src/ReactFiberHooks.js`的`renderWithHooks`中）

4. `ReactCurrentDispatcher.current = HooksDispatcherOnMount` 中对应的 `HooksDispatcherOnMount` 是一个对象，上面有 `useReducer` 的属性，那自然就关联上【第一点】说的了
