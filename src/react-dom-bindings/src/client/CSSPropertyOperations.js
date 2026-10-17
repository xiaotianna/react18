export function setValueForStyles(node, styles) {
  const { style } = node
  // node：<div style={{ color: 'red }} />
  // styles = {color: 'red'}
  for (const styleName in styles) {
    if (styles.hasOwnProperty(styleName)) {
      const styleValue = styles[styleName]
      style[styleName] = styleValue
    }
  }
}
