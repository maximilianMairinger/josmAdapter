import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription, internalDataBaseBridge, dataBaseParsingId as parsingId } from "josm"
import { PrimaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import cloneKeys from "circ-clone"
import { resolvePointer, toPointer } from "./mongoReflection"
import { MultiMap } from "more-maps"



type UnifiedDataAndBase = {
  get: ((cb: (data: any) => void, init?: boolean) => (DataSubscription<[unknown]> | DataBaseSubscription<[unknown]>)) & (() => (unknown)),
  set: (val: any) => void
}


// legacy. Pretty much the same as dataBaseToAdapter
export function unifyDataAndDataBase(data_dataBase: Data<any> | DataBase): UnifiedDataAndBase {
  console.warn("unifyDataAndDataBase is deprecated. Use dataBaseToAdapter instead.")
  if (data_dataBase[instanceTypeSym] === "Data") {
    const data = data_dataBase as Data<any>
    return {
      get(cb?: (data: any) => void, init?: boolean) {
        return data.get(cb, init)
      },
      set: data.set.bind(data)
    }
  }
  else {
    const dataBase = data_dataBase as DataBase
    return {
      get(cb?: (data: any) => void, init?: boolean) {
        if (cb === undefined) return dataBase() as any
        return dataBase((fullData, diffData) => {
          cb(diffData)
        }, true, init) as any as DataBaseSubscription<[unknown]>
      },
      set(val) {
        dataBase(val)
      }
    }
  }
}



export function dataBaseToAdapter(data_dataBase: Data | DataBase): PrimaryStoreAdapter {
  if (data_dataBase[instanceTypeSym] === "Data") {
    const data = data_dataBase as Data<any>
    return {
      onMsg(cb: (data: any) => void) {
        const r = data.get(cb, false) as any
        return () => {r.deactivate()}
      },
      send: data.set.bind(data),
      msg() {
        return cloneKeys(data.get())
      },
      [isAdapterSym]: true
    }
  }
  else {
    const db = data_dataBase as DataBase

    return {
      msg() {
        return db()
      },
      send(dataDiff: any) {
        if (typeof dataDiff !== "object" || dataDiff === null) throw new Error("dataDiff must be an object")
        db(parseEscapedRecursion(db(), dataDiff))
      },
      onMsg(cb: (data: any) => void) {
        const r = db(function subFunc(full, diff) {
          cb(escapeRecursion(diff, subFunc))
        }, true, false) as any
        return () => {r.deactivate()}
      },
      [isAdapterSym]: true
    }

  }
}


type InternalDataBase<T> = {}
type dbDiff = object

export const escapeRecursion = (() => {
  let known: Map<any, any>
  return function escapeRecursion(diff: dbDiff, rootSub: any) {
    known = new Map()
    return escapeRecursionFromDBRec(diff, rootSub)
  }

  function escapeRecursionFromDBRec(diff: dbDiff, rootSub: any) {
    if (known.has(diff)) return known.get(diff)
    const res = {}
    known.set(diff, res)
    for (let dk in diff) {
      let val = diff[dk]
      if (val instanceof Object) {
        if (val[parsingId] !== undefined) {
          const db = val[parsingId][internalDataBaseBridge] as InternalDataBase<{}>
          const parents = getParents(db)
          if (parents.size >= 2  || ((db as any).isRoot && parents.size === 1)) {
            // what if this (the new ref) is the new most shallowest connection to the root
            res[dk] = { $ref: findRoot(db, rootSub) }
          }
          else res[dk] = val
        }
        else {
          res[dk] = escapeRecursionFromDBRec(val, rootSub)
        }
      }
      else {
        if (dk === "$ref" && typeof val === "string" && val.startsWith("#")) val = "#" + val
        res[dk] = val
      }
    }
    return res
  }
})()

function findRoot(db: InternalDataBase<{}>, findSub: any) {
  const initChildMap = getParents(db)
  for (const sub of (db as any).subscriptionsOfChildChanges) {
    if (sub === findSub) return toPointer([])
  }

  
  let lastVal: any
  let lastVals: any

  const keys = [...initChildMap.keys()]
  const removeLastVal = keys.length > 1 // is root if this is 1
  if (removeLastVal) {
    // we dont want to look into the last path, as it is the one that was just added.
    const lastKey = keys[keys.length - 1]
    lastVals = initChildMap.get(lastKey)
    lastVal = lastVals.pop()
  } 
  


  try {
    const initEntries = [...initChildMap.entries()]

    let currentLevel = initEntries.map(e => e[0])
    let currentPath = initEntries.map(e => [e[1][0].key]) as any[]


  
  
  
    let nextLevel: typeof currentLevel
    let nextPath: typeof currentPath
  
    while(true) {
      nextPath = []
      nextLevel = []
  
      let i = 0
      for (const db of currentLevel) {
        for (const sub of (db as any).subscriptionsOfChildChanges) {
          if (sub === findSub) return toPointer(currentPath[i])
        }
  
  
        const myNextLevelMap = getParents(db)
        const fullPath = currentPath[i]
        for (const [dbDeep, deepPaths] of myNextLevelMap) {
          nextPath.push([deepPaths[0].key, ...fullPath])
          nextLevel.push(dbDeep)
        }
  
        i++
      }
      
      currentLevel = nextLevel
      currentPath = nextPath
    }
  }
  finally {
    if (removeLastVal) {
      lastVals.push(lastVal)
    }
  }
}

function getParents(db: InternalDataBase<{}>) {
  return (db as any).beforeDestroyCbs as MultiMap<InternalDataBase<{}>, {key: string}>
}



export function parseEscapedRecursion(rootStore: object, diff: object, mergeIntoDiff = true) {
  let known = new Set()

  const mergeInto = mergeIntoDiff ? diff : rootStore
  rec(diff, mergeInto)
  return mergeInto


  function rec(diff: any, mergeInto?: object) {
    
    if (typeof diff === "object" && diff !== null) {
      const mergeIntoIsObj = typeof mergeInto === "object" && mergeInto !== null
      if (mergeIntoIsObj) {
        if (known.has(mergeInto)) return mergeInto
        known.add(mergeInto)
      }
      

      for (const key of Object.keys(diff)) {
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
          // length of array can be set this way... 
          if (mergeIntoIsObj && (Object.hasOwn(mergeInto, key) || mergeInto[key] === undefined)) {
            mergeInto[key] = rec(val, mergeInto[key])
          }
        }
      }
      return mergeInto
    }
    else return diff
  }
}
