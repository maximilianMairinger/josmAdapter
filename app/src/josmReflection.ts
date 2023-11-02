import { Data, DataBase, instanceTypeSym } from "josm";
import { fullyConnectedJosmAdapter, SecondaryStoreAdapter, PrimaryStoreAdapter, isAdapterSym, dataBaseToAdapter } from "./josmAdapter";



type Prim = boolean | string | number | null | undefined
type Wrapped<Prim> = Prim | (() => Prim | Promise<Prim>) | Promise<Prim>
type PrimOrObWrapped = Wrapped<Prim> | Wrapped<{[key in string | number]: PrimOrObWrapped}>



type MaybeWrapped<T> = PromiseUnwrap<FunctionUnwrap<T>>
type FunctionUnwrap<T> = T extends (...any: any) => infer R ? R : T
type PromiseUnwrap<T> = T extends Promise<infer R> ? R : T

type DefaultVal<T, Unwrapped extends MaybeWrapped<T> = MaybeWrapped<T>> = Unwrapped extends {[key in string | number]: any} ? {[key in keyof Unwrapped]: DefaultVal<Unwrapped[key]>} :Unwrapped






export async function reflection(reflection: SecondaryStoreAdapter, output: PrimaryStoreAdapter | ((initValue: unknown) => PrimaryStoreAdapter | Promise<PrimaryStoreAdapter>)): Promise<any> {
  fullyConnectedJosmAdapter(output, reflection, true, true)
}


export async function josmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(reflectionAdapter: SecondaryStoreAdapter, output: PrimOrObWrapped & T): Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> 
export async function josmReflection<DB extends Data<T> | DataBase<T>, T>(reflectionAdapter: SecondaryStoreAdapter, output: DB): Promise<{adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}>
export async function josmReflection(reflectionAdapter: SecondaryStoreAdapter, output: PrimOrObWrapped | Data | DataBase): Promise<{adapter: PrimaryStoreAdapter, db: Data | DataBase}>
export async function josmReflection(reflectionAdapter: SecondaryStoreAdapter, output: PrimOrObWrapped | Data | DataBase) {
  return new Promise<any>((res) => {
    reflection(reflectionAdapter, async (initData: unknown) => {
      let db: Data | DataBase
      const outputIsntDB = output[instanceTypeSym] === undefined
      if (outputIsntDB) {
        const data = await crawlCyclicAndCallFunc(output, initData)
        db = ((typeof initData === "object" && initData !== null) ? new DataBase(data) : new Data(data))
      }
      else db = output as Data | DataBase
      const adapter = dataBaseToAdapter(db)
      if (!outputIsntDB) {
        adapter.send(initData)
      }

      if (db[instanceTypeSym] === "Data" && (typeof initData === "object" || initData !== null)) new Error("Reflection is object be should be primitive based on default.")
      if (db[instanceTypeSym] === "DataBase" && !(typeof initData === "object" || initData !== null)) new Error("Reflection is primitive be should be object based on default.")


      res({db, adapter})
      return adapter
    })
  })
}



export function makeJosmReflection<Instance>(instanceToAdapterFunc: (instance: Instance) => (SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>)) {
  async function specificJosmReflection<T, Q extends DefaultVal<T> = DefaultVal<T>>(fsPath: Instance, output: PrimOrObWrapped & T): Promise<{adapter: PrimaryStoreAdapter, db: Q extends object ? DataBase<Q> : Data<Q>}> 
  async function specificJosmReflection<DB extends Data<T> | DataBase<T>, T>(fsPath: Instance, output: DB): Promise<{adapter: PrimaryStoreAdapter, db: DB extends Data<infer R> ? R : DB extends DataBase<infer R> ? R : never}>
  async function specificJosmReflection(fsPath: Instance, output: PrimOrObWrapped | Data | DataBase) {
    return josmReflection(await instanceToAdapterFunc(fsPath), output)
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



