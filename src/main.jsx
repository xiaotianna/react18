import { createRoot } from 'react-dom/client'

const element = (
  <h1>
    hello <span style={{ color: 'red' }}>world</span>
  </h1>
)

console.log(element)

const root = createRoot(document.querySelector('#root'))
console.log(root);

root.render(element)
