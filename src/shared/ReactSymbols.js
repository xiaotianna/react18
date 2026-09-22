// 为了防止其他人滥用 $$typeof，需要将它定义为一个独一无二的值，所以采用 Symbol
export const REACT_ELEMENT_TYPE = Symbol.for('react.element')
