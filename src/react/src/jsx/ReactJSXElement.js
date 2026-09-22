import hasOwnProperty from 'shared/hasOwnProperty'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'

function hasVaildKey(config) {
  return config.key !== undefined
}

function hasVaildRef(config) {
  return config.ref !== undefined
}

// 保留的属性，这些属性不会放在props上
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true
}

export function jsxDEV(type, config) {
  debugger
  const props = {} // 属性对象
  let key = null // 每个虚拟dom可以有一个可选的key属性，用来区分一个父节点下的不同子节点
  let ref = null // 后面可以通过ref获取到真实的dom
  if (hasVaildKey(config)) {
    key = config.key
  }
  if (hasVaildRef(config)) {
    ref = config.ref
  }
  // 遍历其余的props属性名
  for (const propName in config) {
    // 只需要找本身的属性，判断是config上的属性还是原型链上的，如果是config自己的属性就进行赋值，原型链就不管
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName]
    }
  }
  return ReactElement(type, key, ref, props)
}

// 虚拟dom
function ReactElement(type, key, ref, props) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type, // h1、span
    key, // 唯一标识
    ref, // 获取真实dom
    props, // 属性：children、style、id等
    __mark__: 't1an'
  }
}
