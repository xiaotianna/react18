# 03-添加到更新队列

在 【02-创建FiberRoot】中已经已经有了更新队列的数据结构，在 [src/react-reconciler/src/ReactFiberRoot.js](src/react-reconciler/src/ReactFiberRoot.js) 中的 `initialUpdateQueue` 方法

在 `main.jsx` 中：

```jsx
const root = createRoot(document.querySelector('#root'))
// 把element虚拟dom渲染到容器中
root.render(element)
```

通过 `render` 方法来开始整个添加更新流程，代码如下：

```js
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot
  // 传入的root就是FiberRootNode，也就是div#root
  updateContainer(children, root)
}
```

- updateContainer方法：

```js
/**
 * 更新容器，把虚拟dom element变成真实dom插入到container中
 * @param {*} element 虚拟dom
 * @param {*} container 真实dom容器 FiberRootNode -> div#root
 */
export function updateContainer(element, container) {
  // 获取当前的根fiber：HostRootFiber
  const current = container.current
  // 创建更新
  const update = createUpdate()
  // 要更新的虚拟dom
  /**
   * update描述一次更新，payload保存这次更新需要修改的数据
   * ❓至于为什么update是对象？因为update是一个链表，结构是：
   *  const update = {
        payload: { element }, // 本次更新的数据
        next: null           // 指向下一个更新
      }
   */
  update.payload = { element }
  // 把此更新对象添加到current这个根fiber的更新队列上
  enqueueUpdate(current, update)
}
```
