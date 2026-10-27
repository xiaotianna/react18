# 16-commitUpdate

从 `src/react-reconciler/src/ReactFiberCompleteWork.js` 开始，分别是：

1. 先给 `completeWork` 添加 `FunctionComponent` 的冒泡
2. 然后对于 `HostComponent` 类型，其中的 `updateHostComponent` 方法中的 `prepareUpdate` 需要完善，用于收集差异，进行diff属性比较

然后是 `src/react-dom-bindings/src/client/ReactDOMComponent.js` 的 `prepareUpdate`，在进行diff对比，其中的 `diffProperties` 在比较新旧 props，把需要更新的内容整理成清单，交给提交阶段修改 DOM，需要进行两次对比：

```text
两个方向各遍历一轮，分工不同：
- 旧 → 新：检查旧属性在新对象里是否还存在，记录需要删除的属性。
- 新 → 旧：检查新属性是否新增、值是否变化，记录需要设置的属性。
```

最后是对 `src/react-reconciler/src/ReactFiberCommitWork.js` 的 `commitMutationEffectsOnFiber` 进行修改，需要完善 `HostComponent` 类型的逻辑，也就是需要新增dom更新的步骤，只针对原生节点需要更新的处理，进行 `commitUpdate`，变更真实dom
