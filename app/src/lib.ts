export const toPointer = (parts) => '#' + ["", ...parts].map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')
export const resolvePointer = (pointer) => {
  let p = pointer.slice(1)
  const ar = [] as any[]
  if (p === "") return ar
  p = p.slice(1)
  for (const part of p.split('/').map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    ar.push(part)
  }
  return ar
}

export function parseDataDiff(full: any, diff: any) {
  let data: any
  if (typeof diff === "object" && diff !== null) { 
    if (typeof full !== "object" || full === null) data = diff
    else {
      data = parseEscapedRecursion(full, diff, false)
      
    }
  }
  else data = diff
  return data
}

export function parseEscapedRecursion(rootStore: object, diff: object, mergeIntoDiff = true) {
  let known = new Set()

  const mergeInto = mergeIntoDiff ? diff : rootStore
  rec(diff, mergeInto)
  return mergeInto


  function rec(diff: any, mergeInto: object = {}) {
    if (diff instanceof Object) {
      if (known.has(mergeInto)) return mergeInto
      known.add(mergeInto)

      for (const key in diff) {
        const val = diff[key]
        if (key === "$ref" && typeof val === "string") {
          if (val.startsWith("##")) diff[key] = val.slice(1)
          else if (val.startsWith("#")) {
            const path = resolvePointer(val)
            
            let c = rootStore
            for (const entry of path) {
              c = c[entry]
            }
            return c
          }
        }
        else {
          const ret = rec(val, mergeInto[key])
          if (Object.hasOwn(mergeInto, key) || !(key in Object.prototype)) mergeInto[key] = ret
        }
      }
      return mergeInto
    }
    else return diff
  }
}
