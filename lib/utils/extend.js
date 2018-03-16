// from jquery
function isPlainObject(obj) {
  var proto, Ctor;
  // Detect obvious negatives
  if ( !obj || Object.prototype.toString.call( obj ) !== '[object Object]' ) {
    return false;
  }
  proto = Object.getPrototypeOf( obj );
  // Objects with no prototype (e.g., `Object.create( null )`) are plain
  if ( !proto ) {
    return true;
  }
  // Objects with prototype are plain iff they were constructed by a global Object function
  Ctor = Object.prototype.hasOwnProperty.call( proto, 'constructor' ) && proto.constructor;
  return typeof Ctor === 'function' && Function.prototype.toString.call( Ctor ) === Function.prototype.toString.call( Object );
}

module.exports = function extend(target, ...source) {
  return source.reduce(function e(target, source) {
    Object.keys(source).forEach(function (key) {
      let value = source[key]
      if (typeof value !== 'undefined') {
        if (Array.isArray(value)) {
          target[key] = e([], value)
        }
        else if (isPlainObject(value)) {
          target[key] = e(isPlainObject(target[key]) ? target[key] : {}, value)
        }
        else {
          target[key] = value
        }
      }
    })
    return target
  }, target)
}
