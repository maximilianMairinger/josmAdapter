import { Data, DataBase, instanceTypeSym } from "josm"
import { mkdir, promises as fs } from "fs"
import * as path from "path"
import { stringify, parse } from "circ-json"
import { mkdirp } from "mkdirp"
import clone from "circ-clone"
import { memoize } from "key-index"


const exists = (filename: string) => fs.stat(filename).then(() => true).catch(() => false)

type Prim = boolean | string | number | null | undefined
type Wrapped<Prim> = Prim | (() => Prim | Promise<Prim>) | Promise<Prim>
type PrimOrObWrapped = Wrapped<Prim> | Wrapped<{[key in string | number]: PrimOrObWrapped}>



type MaybeWrapped<T> = PromiseUnwrap<FunctionUnwrap<T>>
type FunctionUnwrap<T> = T extends (...any: any) => infer R ? R : T
type PromiseUnwrap<T> = T extends Promise<infer R> ? R : T

type DefaultVal<T, Unwrapped extends MaybeWrapped<T> = MaybeWrapped<T>> = Unwrapped extends {[key in string | number]: any} ? {[key in keyof Unwrapped]: DefaultVal<Unwrapped[key]>} :Unwrapped



async function crawlCyclicAndCallFunc(ob: unknown, whereNeeded: unknown) {
  const store = new Map()
  async function crawlCyclicAndCallFuncRec(ob: unknown, whereNeeded: unknown, path: string[]) {
    if (whereNeeded !== undefined && typeof whereNeeded !== "object") {
      if (typeof ob !== typeof whereNeeded && !(ob instanceof Promise) && !(ob instanceof Function)) throw new Error(`Type mismatch at "${path.join(".")}": ${typeof ob} (default) !== ${typeof whereNeeded} (disk)`)
      return whereNeeded
    }

    if (store.has(ob)) return store.get(ob)
    const ogOb = ob
    if (typeof ob === "function") {
      ob = ob()
      store.set(ogOb, ob)
    }
    ob = await ob
    if (typeof ob === "object") {
      const ret = Object.create(null)
      store.set(ogOb, ret)
      if (whereNeeded === undefined) whereNeeded = Object.create(null)
      for (let key in ob) {
        if (key === "__proto__") continue
        ret[key] = await crawlCyclicAndCallFuncRec(ob[key], whereNeeded[key], [...path, key])
      }
      return ret
    }
    else if (typeof whereNeeded === "object") throw new Error(`Type mismatch at "${path.join(".")}": ${typeof ob} (default) !== ${typeof whereNeeded} (disk)`)

    return ob
  }
  return crawlCyclicAndCallFuncRec(ob, whereNeeded, [])
}




export async function josmFsAdapter<DB extends Data<T> | DataBase<T>, T>(fsPath: string, dataOrDb: DB): Promise<DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never>
export async function josmFsAdapter<T, Q extends DefaultVal<T> = DefaultVal<T>>(fsPath: string, initValue: T & PrimOrObWrapped): Promise<Q extends object ? DataBase<Q> : Data<Q>>
export async function josmFsAdapter(fsPath: string, dbOrDataOrInits: Data<unknown> | DataBase<any> | unknown | Promise<unknown> | (() => (unknown | Promise<unknown>))): Promise<any> {
  let dataOrDb: Data<unknown> | DataBase<any>
  let ret: any

  const waitTillPath = mkdirp(path.dirname(fsPath))

  const fileExists = await exists(fsPath)
  if (fileExists && (await fs.stat(fsPath)).isDirectory()) {
    new Error("josmFsAdapter: fsPath is a directory")
  }

  let initData: any

  let proms: Promise<any>[] = []

  if (dbOrDataOrInits[instanceTypeSym] === undefined) {

    let givenDefaultVal = memoize((whereNeeded) => crawlCyclicAndCallFunc(dbOrDataOrInits, whereNeeded))

    let rawData: string
    try {
      initData = parse(rawData = await fs.readFile(fsPath, "utf8"))
    }
    catch(e) {
      if (fileExists) if (rawData !== "") throw new Error("josmFsAdapter: fsPath exists, but is not a valid json")
      initData = await givenDefaultVal(undefined)
    }

    const data = await givenDefaultVal(initData)
    proms.push(waitTillPath.then(() => writeToDisk(data)))
    ret = dataOrDb = typeof initData === "object" ? new DataBase(data) : new Data(data)
  }
  else {
    dataOrDb = dbOrDataOrInits as Data<unknown> | DataBase<any>
    let unableToRead = false

    let rawData: string
    try {
      initData = parse(rawData = await fs.readFile(fsPath, "utf8"))
    }
    catch(e) {
      unableToRead = true
      if (fileExists) if (rawData !== "") throw new Error("josmFsAdapter: fsPath exists, but is not a valid json")
    }
    
    if (!unableToRead) {
      console.log("able to read")
      if (typeof initData === "object") if (dataOrDb[instanceTypeSym] !== "DataBase") throw new Error("josmFsAdapter: data on disk is an object, but given is a Data instance")
      if (typeof initData !== "object") if (dataOrDb[instanceTypeSym] !== "Data") throw new Error("josmFsAdapter: data on disk is not an object, but given is a DataBase instance")

      if (dataOrDb[instanceTypeSym] === "DataBase") {
        (dataOrDb as DataBase<any>)(initData)
      }
      else {
        (dataOrDb as Data<any>).set(initData)
      }
    }
    else {
      let writeData: any
      if (dataOrDb[instanceTypeSym] === "DataBase") writeData = clone((dataOrDb as DataBase<any>)())
      else writeData = (dataOrDb as Data<any>).get()

      proms.push(waitTillPath.then(() => writeToDisk(writeData)))
      initData = writeData
    }

    ret = initData
  }
  

  // write to disk

  async function writeToDisk(data: any) {
    if (data === undefined) await fs.writeFile(fsPath, "", "utf8")
    else await fs.writeFile(fsPath, stringify(data), "utf8")
  }

  

  if (dataOrDb instanceof Data) {
    dataOrDb.get(writeToDisk, false)
  }
  else {
    dataOrDb(writeToDisk, true, false)
  }

  await Promise.all(proms)

  return ret
}



export default josmFsAdapter
