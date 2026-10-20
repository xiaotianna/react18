# 11-事件注册

> 这次的内容比较的多，但是大部分都是函数之间的透传参数。

本次更改的阅读路径，分为3条路：

- 路线1：注册事件，从 [src/react-dom-bindings/src/events/DOMPluginEventSystem.js](src/react-dom-bindings/src/events/DOMPluginEventSystem.js) 的 `SimpleEventPlugin.registerEvents()` 开始

- 路线2：从 [src/react-dom/src/client/ReactDOMRoot.js](src/react-dom/src/client/ReactDOMRoot.js) 的 `createRoot` 方法的 `listenToAllSupportedEvents` 开始

- 路线3：是 `src/react-reconciler/src/ReactFiberCompleteWork.js` 的 `completeWork` 方法中的 `case: HostComponent` 中的 `createInstance` 的 `precacheFiberNode` 和 `updateFiberProps`
