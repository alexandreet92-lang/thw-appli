var R = window.React
function jsx(t, p, k) {
  var r = {}; for (var x in p) if (x !== 'children') r[x] = p[x]
  if (k !== undefined) r.key = k
  var c = p.children
  return Array.isArray(c) ? R.createElement.apply(R, [t, r].concat(c)) : c === undefined ? R.createElement(t, r) : R.createElement(t, r, c)
}
module.exports = { jsx: jsx, jsxs: jsx, Fragment: R.Fragment }
