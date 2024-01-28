import { CancelAblePromise } from "more-proms"

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



export function parseEscapedRecursion(rootStore: object, diff: object, mergeIntoDiff = false) {
  let known = new Set()

  const mergeInto = mergeIntoDiff ? diff : rootStore
  rec(diff, mergeInto)
  return mergeInto


  function rec(diff: any, mergeInto?: object) {
    
    if (typeof diff === "object" && diff !== null) {
      
      
      const keys = Object.keys(diff)

      if (keys.length === 1 && keys[0] === "$ref" && typeof diff.$ref === "string") {
        const val = diff.$ref
        if (val.startsWith("##")) diff.$ref = val.slice(1)
        else if (val.startsWith("#")) {
          const path = resolvePointer(val)
          
          let c = rootStore
          for (const entry of path) c = c[entry]
          return c
        }
      }

      const mergeIntoIsObj = typeof mergeInto === "object" && mergeInto !== null

      if (mergeIntoIsObj) {
        if (known.has(diff)) return mergeInto
        known.add(diff)


        for (const key of Object.keys(diff)) {
          const val = diff[key]


          if (!mergeIntoDiff && val === undefined) delete mergeInto[key] 
          // length of array can be set this way... 
          else if (Object.hasOwn(mergeInto, key) || mergeInto[key] === undefined) 
            mergeInto[key] = rec(val, mergeInto[key])
            
          
          
        }
        return mergeInto
      }
      else return diff
    }
    else return diff
  }
}



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



export const defaultTransactionOptions = {access: "readonly", skipAble: false, skipPrevIfPossible: false} as {access?: "readwrite" | "readonly", skipAble?: boolean | (() => void), skipPrevIfPossible?: boolean}



export type UniDB<ID = unknown> = {
  findOne(id?: ID): Promise<unknown> 
  insertOne(doc: object): Promise<ID>
  updateOne(diff: { [key: string]: undefined | unknown }, id?: ID): Promise<void>
  transaction<T, R extends Promise<T> | CancelAblePromise<T, string, Promise<void> | undefined>>(f: () => R, options?: typeof defaultTransactionOptions): R
  rootId: ID
}

export type SimpleUniDB = {
  findOne(id?: never): Promise<unknown> 
  // insertOne(doc: object): Promise<never>
  updateOne(diff: { [key: string]: undefined | unknown }, id?: never): Promise<void>
  transaction<T, R extends Promise<T> | CancelAblePromise<T, string, Promise<void> | undefined>>(f: () => R, options?: typeof defaultTransactionOptions): R
}
