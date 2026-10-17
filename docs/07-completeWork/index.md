# 07-completeWork

在 `src/react-reconciler/src/ReactFiberWorkLoop.js` 中，当完成一个工作单元后，就需要调用完成方法，也就是 `performUnitOfWork` 的 `completeUnitOfWork`

```js
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
```

## completeUnitOfWork

当前工作fiber已经完成，那就去找对应的兄弟fiber，如果还有兄弟fiber，就将这个兄弟fiber设置为workInProgress，如果没有兄弟fiber后，那就把workInProgress设置为父fiber

## completeWork