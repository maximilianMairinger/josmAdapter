import { Data, DataBase, instanceTypeSym } from "josm";
import { fullyConnectedJosmAdapter, SecondaryStoreAdapter, PrimaryStoreAdapter, isAdapterSym, dataBaseToAdapter, SecondaryTransmissionAdapter, PrimaryTransmissionAdapter } from "./fullyConnectedAdapter";
import { ResablePromise } from "more-proms";



export type Prim = boolean | string | number | null | undefined
export type Wrapped<Prim> = Prim | (() => Prim | Promise<Prim>) | Promise<Prim>
export type PrimOrObWrapped = Wrapped<Prim> | Wrapped<{[key in string | number]: PrimOrObWrapped}>



export type MaybeWrapped<T> = PromiseUnwrap<FunctionUnwrap<T>>
export type FunctionUnwrap<T> = T extends (...any: any) => infer R ? R : T
export type PromiseUnwrap<T> = T extends Promise<infer R> ? R : T

export type DefaultVal<T, Unwrapped extends MaybeWrapped<T> = MaybeWrapped<T>> = Unwrapped extends {[key in string | number]: any} ? {[key in keyof Unwrapped]: DefaultVal<Unwrapped[key]>} : Unwrapped





export type PrimHasPromiseSomewhere<T> = T extends Promise<any> ? true : T extends (...a: any[]) => infer R ? R extends Promise<any> ? true : false : false
export type ObHasPromiseSomewhere<T> = PrimHasPromiseSomewhere<T> extends true ? true : T extends object ? {[key in keyof T]: ObHasPromiseSomewhere<T[key]>}[keyof T] extends false ? false : true : PrimHasPromiseSomewhere<T>


export function josmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(reflectionAdapter: SecondaryStoreAdapter, output: PrimOrObWrapped & T, reverse: true): ObHasPromiseSomewhere<T> extends true ? Promise<JosmReflectionRetA<Q>> : JosmReflectionRetA<Q> 
export function josmReflection<DB extends Data<T> | DataBase<T>, T>(reflectionAdapter: SecondaryStoreAdapter, output: DB, reverse: true): {adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}

export function josmReflection<T, Ad extends PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>, Q extends DefaultVal<T> = DefaultVal<T>>(reflectionAdapter: Ad, output: PrimOrObWrapped & T, reverse?: false): ObHasPromiseSomewhere<T> extends true ? Promise<JosmReflectionRetA<Q>> : "msg" extends keyof Ad ? Ad["msg"] extends (...a: any[]) => infer R ? IsAny<R> extends true ? JosmReflectionRetA<Q> : R extends Promise<any> ? R : JosmReflectionRetA<Q> : Promise<JosmReflectionRetA<Q>> : never 
export function josmReflection<DB extends Data<T> | DataBase<T>, T>(reflectionAdapter: PrimaryTransmissionAdapter, output: DB, reverse?: false): {adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}

export function josmReflection(reflectionAdapter: PrimaryTransmissionAdapter | SecondaryStoreAdapter, output: PrimOrObWrapped | Data | DataBase, reverse = false): any {
  const p = new ResablePromise<{adapter: PrimaryStoreAdapter, db: Data | DataBase}>()
  let pVal: {adapter: PrimaryStoreAdapter, db: Data | DataBase}
  const mkJosmF = (storedData: unknown) => {
    let db: Data | DataBase
    const outputIsntDB = output === undefined || output === null || output[instanceTypeSym] === undefined
    if (outputIsntDB) {
      const data = crawlCyclicAndCallFunc(output as object, storedData)
      db = ((typeof output === "object" && output !== null) ? new DataBase(data) : new Data(data)) as Data | DataBase
    }
    else db = output as Data | DataBase
    const adapter = dataBaseToAdapter(db)
    if (!outputIsntDB) {
      adapter.send(storedData)
    }

    if (db[instanceTypeSym] === "Data" && (typeof storedData === "object" || storedData !== null)) new Error("Reflection is object be should be primitive based on default.")
    if (db[instanceTypeSym] === "DataBase" && !(typeof storedData === "object" || storedData !== null)) new Error("Reflection is primitive be should be object based on default.")


    p.res(pVal = {db, adapter})
    return adapter
  }
  if (!reverse) fullyConnectedJosmAdapter(reflectionAdapter as PrimaryTransmissionAdapter, mkJosmF, true, true)
  else fullyConnectedJosmAdapter(mkJosmF, reflectionAdapter as SecondaryStoreAdapter, true, true)

  if (pVal !== undefined) return pVal
  else return p
}


type IsAny<T> = 0 extends (1 & T) ? true : false



type JosmReflectionRetA<Q> = {adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}
type SpecificJosmReflectionRetA<Q> = Q extends object ? DataBase<Q> : Data<Q>
type SpecificJosmReflectionRetB<DB> = DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never


type SpecificJosmReflection<Instance, Reverse extends boolean, Ad> = Reverse extends true ?
      (<T, Q extends DefaultVal<T> = DefaultVal<T>>(instance: Instance, output: PrimOrObWrapped & T) => ObHasPromiseSomewhere<T> extends true ? Promise<SpecificJosmReflectionRetA<Q>> : SpecificJosmReflectionRetA<Q>)
    & (<DB extends Data<T> | DataBase<T>, T>(instance: Instance, output: DB) => Ad extends Promise<any> ? Promise<SpecificJosmReflectionRetB<DB>> : SpecificJosmReflectionRetB<DB>)
  :
      (<T, Q extends DefaultVal<T> = DefaultVal<T>>(instance: Instance, output: PrimOrObWrapped & T) => ObHasPromiseSomewhere<T> extends true ? Promise<SpecificJosmReflectionRetA<Q>> : "msg" extends keyof Ad ? Ad["msg"] extends (...a: any[]) => infer R ? IsAny<R> extends true ? SpecificJosmReflectionRetA<Q> : R extends Promise<any> ? R : SpecificJosmReflectionRetA<Q> : Promise<SpecificJosmReflectionRetA<Q>> : never)
    & (<DB extends Data<T> | DataBase<T>, T>(instance: Instance, output: DB) => Ad extends Promise<any> ? Promise<SpecificJosmReflectionRetB<DB>> : SpecificJosmReflectionRetB<DB>)


export function makeJosmReflection<Instance, Ad extends SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>>(instanceToAdapterFunc: (instance: Instance) => Ad, reverse: true): SpecificJosmReflection<Instance, true, Ad>
export function makeJosmReflection<Instance, Ad extends PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>>(instanceToAdapterFunc: (instance: Instance) => Ad, reverse?: false): SpecificJosmReflection<Instance, false, Ad> 
export function makeJosmReflection<Instance, R extends PrimaryTransmissionAdapter | SecondaryStoreAdapter | Promise<PrimaryTransmissionAdapter | SecondaryStoreAdapter>>(instanceToAdapterFunc: (instance: Instance) => R, reverse?: boolean): any {

  function specificJosmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(instance: Instance, output: PrimOrObWrapped & T): ObHasPromiseSomewhere<T> extends true ? Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> : {adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}
  function specificJosmReflection<DB extends Data<T> | DataBase<T>, T>(instance: Instance, output: DB): {adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}
  function specificJosmReflection(instance: Instance, output: PrimOrObWrapped | Data | DataBase): any {
    const ins = instanceToAdapterFunc(instance)
    return ins instanceof Promise ? ins.then((ins) => josmReflection(ins as SecondaryStoreAdapter, output as PrimOrObWrapped, reverse as true).db) : (() => {
      const r = josmReflection(ins as PrimaryTransmissionAdapter, output as PrimOrObWrapped, reverse as false)
      return r instanceof Promise ? r.then((r) => r.db) : r.db
    })()
  }
  return specificJosmReflection
}




export function callInOrder() {
  const queue = [] as {prom: ResablePromise, f: Function}[]
  return function queueFunc(f: Function) {
    const prom = new ResablePromise()
    queue.push({prom, f})
    if (queue.length === 1) startQueue()
    return prom
  }
  async function startQueue() {
    while(queue.length > 0) {
      const {prom, f} = queue.shift()
      const r = f()
      if (r instanceof Promise) await r
      prom.res(r)
    }
  }
}





export function crawlCyclicAndCallFunc<D, O>(defaults: D, object: O, oneFunctionCallAtATime = true): DefaultVal<D> | Promise<DefaultVal<D>> {
  const store = new Map()

  const callFunc = oneFunctionCallAtATime ? callInOrder() : (f: Function) => f()

  const proms = []

  function crawlCyclicAndCallFuncRec(defaults: unknown, object: unknown, path: string[]) {
    if (typeof defaults !== typeof object && !(defaults instanceof Promise) && !(defaults instanceof Function) && (defaults !== undefined) && (object !== undefined)) throw new Error(`Type mismatch at "${path.join(".")}": ${typeof defaults} (default) !== ${typeof object} (disk)`)
    if (object !== undefined && typeof object !== "object") {
      return object
    }

    // object is now ether undefined or an object or null

    

    if (typeof object === "object" && object !== null) {
      if (typeof defaults === "object" && object !== null) {
        const ret = {}
        if (store.has(defaults)) return store.get(defaults)
        store.set(store, ret)

        const keys = new Set([...Object.keys(defaults), ...Object.keys(object)])
        for (const key of keys) {
          ret[key] = crawlCyclicAndCallFuncRec(defaults[key], object[key], [...path, key])
        } 
        return ret
      }
      else return object
    }
    else if (defaults === undefined || defaults === null) return object
    else if (object === undefined || object === null) {
      if (typeof defaults === "function") defaults = callFunc(defaults)
      if (defaults instanceof Promise) {
        const p = defaults.then((def) => def)
        proms.push(p)
        return p
      }
      else return defaults
    }
    else throw new Error("Unexpected error")
  }

  const r = crawlCyclicAndCallFuncRec(defaults, object, [])
  

  if (proms.length > 0) return Promise.all(proms).then(() => r) as any
  else return r as any
}



