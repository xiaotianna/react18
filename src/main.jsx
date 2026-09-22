import { createRoot } from 'react-dom/client'

const element = (
  <h1>
    hello <span style={{ color: 'red' }}>world</span>
  </h1>
)

console.log(element)

createRoot(document.querySelector('#root')).render(element)
