import { Data, DataBase, instanceTypeSym } from "josm";
import { fullyConnectedJosmAdapter, SecondaryStoreAdapter, PrimaryStoreAdapter, isAdapterSym, dataBaseToAdapter, SecondaryTransmissionAdapter, PrimaryTransmissionAdapter } from "./fullyConnectedAdapter";



export type Prim = boolean | string | number | null | undefined
export type Wrapped<Prim> = Prim | (() => Prim | Promise<Prim>) | Promise<Prim>
export type PrimOrObWrapped = Wrapped<Prim> | Wrapped<{[key in string | number]: PrimOrObWrapped}>



export type MaybeWrapped<T> = PromiseUnwrap<FunctionUnwrap<T>>
export type FunctionUnwrap<T> = T extends (...any: any) => infer R ? R : T
export type PromiseUnwrap<T> = T extends Promise<infer R> ? R : T

export type DefaultVal<T, Unwrapped extends MaybeWrapped<T> = MaybeWrapped<T>> = Unwrapped extends {[key in string | number]: any} ? {[key in keyof Unwrapped]: DefaultVal<Unwrapped[key]>} :Unwrapped







export function josmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(reflectionAdapter: SecondaryStoreAdapter, output: PrimOrObWrapped & T, reverse: true): Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> 
export function josmReflection<DB extends Data<T> | DataBase<T>, T>(reflectionAdapter: SecondaryStoreAdapter, output: DB, reverse: true): Promise<{adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}>
export function josmReflection(reflectionAdapter: SecondaryStoreAdapter, output: PrimOrObWrapped | Data | DataBase, reverse: true): Promise<{adapter: PrimaryStoreAdapter, db: Data | DataBase}>

export function josmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(reflectionAdapter: PrimaryTransmissionAdapter, output: PrimOrObWrapped & T, reverse?: boolean): Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> 
export function josmReflection<DB extends Data<T> | DataBase<T>, T>(reflectionAdapter: PrimaryTransmissionAdapter, output: DB, reverse?: boolean): Promise<{adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}>
export function josmReflection(reflectionAdapter: PrimaryTransmissionAdapter, output: PrimOrObWrapped | Data | DataBase, reverse?: boolean): Promise<{adapter: PrimaryStoreAdapter, db: Data | DataBase}>
export function josmReflection(reflectionAdapter: PrimaryTransmissionAdapter | SecondaryStoreAdapter, output: PrimOrObWrapped | Data | DataBase, reverse = false) {
  return new Promise<any>((res) => {
    const mkJosmF = async (storedData: unknown) => {
      let db: Data | DataBase
      const outputIsntDB = output[instanceTypeSym] === undefined
      if (outputIsntDB) {
        const data = await crawlCyclicAndCallFunc(output, storedData)
        db = ((typeof output === "object" && output !== null) ? new DataBase(data) : new Data(data))
      }
      else db = output as Data | DataBase
      const adapter = dataBaseToAdapter(db)
      if (!outputIsntDB) {
        adapter.send(storedData)
      }

      if (db[instanceTypeSym] === "Data" && (typeof storedData === "object" || storedData !== null)) new Error("Reflection is object be should be primitive based on default.")
      if (db[instanceTypeSym] === "DataBase" && !(typeof storedData === "object" || storedData !== null)) new Error("Reflection is primitive be should be object based on default.")


      res({db, adapter})
      return adapter
    }
    if (!reverse) fullyConnectedJosmAdapter(reflectionAdapter as PrimaryTransmissionAdapter, mkJosmF, true, true)
    else fullyConnectedJosmAdapter(mkJosmF, reflectionAdapter as SecondaryStoreAdapter, true, true)
    
  })
}


type SpecificJosmReflection<Instance> = (<T, Q extends DefaultVal<T> = DefaultVal<T>>(instance: Instance, output: PrimOrObWrapped & T) => Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> )
                                                                                                                                                                  & (<DB extends Data<T> | DataBase<T>, T>(instance: Instance, output: DB) => Promise<{adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}>)


// export function makeJosmReflection<Instance>(instanceToAdapterFunc: (instance: Instance) => SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>, reverse: true): SpecificJosmReflection<Instance>
// export function makeJosmReflection<Instance>(instanceToAdapterFunc: (instance: Instance) => PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>, reverse?: false): SpecificJosmReflection<Instance> 
export function makeJosmReflection<Instance, R extends PrimaryTransmissionAdapter | SecondaryStoreAdapter | Promise<PrimaryTransmissionAdapter | SecondaryStoreAdapter>>(instanceToAdapterFunc: (instance: Instance) => R, reverse?: boolean) {
  type PromOrNo<Val> = R extends Promise<any> ? Promise<Val> : Val

  function specificJosmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(instance: Instance, output: PrimOrObWrapped & T): Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> 
  function specificJosmReflection<DB extends Data<T> | DataBase<T>, T>(instance: Instance, output: DB): Promise<{adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}>
  function specificJosmReflection(instance: Instance, output: PrimOrObWrapped | Data | DataBase): any {
    const ins = instanceToAdapterFunc(instance)
    return ins instanceof Promise ? ins.then((ins) => josmReflection(ins as SecondaryStoreAdapter, output, reverse as true)) : josmReflection(ins as PrimaryTransmissionAdapter, output, reverse as false)
  }
  return specificJosmReflection
}





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
    ob = ob instanceof Promise ? await ob : ob
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



