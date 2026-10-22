# 12-派发执行事件回调

## 合成事件

```jsx
<h1
    onClick={(evnet) => console.log('父冒泡')}
>
```

h1中的回调参数event，就是react帮我们合成的事件对象，并非原生的事件对象

## 阅读开始

1. 先从 `src/react-dom-bindings/src/events/DOMPluginEventSystem.js` 的 `dispatchEventForPlugins` 方法的 `extractEvents` 开始

2. `src/react-dom-bindings/src/events/plugins/SimpleEventPlugin.js` 会创建合成事件对象，然后将event和listener一起添加到`dispatchQueue`中

3. `src/react-dom-bindings/src/events/DOMPluginEventSystem.js` 去执行回调