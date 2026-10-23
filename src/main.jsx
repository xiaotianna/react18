import { createRoot } from 'react-dom/client'
import * as React from 'react'

function counter(state, action) {
  if (action.type === 'add') return state + 1
  return state
}

function FunctionComponent() {
  const [number, setNumber] = React.useReducer(counter, 0)
  return <button onClick={() => setNumber({ type: 'add' })}>{number}</button>
}

const element = <FunctionComponent />
// console.log(element)

const root = createRoot(document.querySelector('#root'))
// console.log(root);

// 把element虚拟dom渲染到容器中
root.render(element)
