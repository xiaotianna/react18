# 27-useRef

注意：ref属性不是作为props上的，而是单独的属性

问：为什么修改 current 不触发渲染？

- 因为它只是普通 JavaScript 对象的属性赋值，没有调用 setState 那样的更新入队和调度逻辑。不触发渲染的直接原因是没有调度更新，而不是“对象引用没变”。

## 1、`src/react-reconciler/src/ReactFiberHooks.js`

实现useRef，分别对应mount和unmount，存和取

## 2、`src/react-reconciler/src/ReactChildFiber.js`

这个文件补了很多`.ref`的赋值，这些 .ref 赋值的作用是：把本次 JSX 元素上的 ref 保存到本轮 Fiber，让提交阶段知道应该把 DOM 交给谁。

例如：

```js
const inputRef = useRef(null)
return <input ref={inputRef} />
```

数据传递过程是：

```js
element.ref = inputRef // JSX 创建元素时保存
fiber.ref = element.ref // ReactChildFiber 中传递
fiber.ref.current = DOM节点 // 提交阶段绑定
```

```js
element = {
  type: 'input',
  ref: inputRef,
  props: {}
}
```

## 3、`src/react-reconciler/src/ReactFiberCompleteWork.js`

ref 不在 props 里，prepareUpdate 永远比较不到它。所以 ref 的变化必须由 completeWork 单独判断出来，变成一个 flag，供 commit 阶段消费

给补充一个`Ref`的flag

## 4、`src/react-reconciler/src/ReactFiberCommitWork.js`

主要核心是：commitDetachRef 把 ref 和 DOM 断开（清空），commitAttachRef 把 ref 和 DOM 接上。它们是唯一实际写 ref.current / 调用回调 ref 的地方。

然后就是在不同的阶段中如何断开和接上了
