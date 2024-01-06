import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription, DataCollection } from "josm";
import { cloneKeys } from "circ-clone"
import { dataBaseToAdapter } from "./dataBaseAdapter";

// export type WebSocketUrl = string | URL 

export const isAdapterSym = Symbol("isAdaperSym")

type UnsubscribeFunc = () => void
export type SecondaryTransmissionAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg?(cb: (data: Partial<Data>) => void): UnsubscribeFunc
  send(dataDiff: Partial<Data>): void
  msg?(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}


export type PrimaryTransmissionAdapter<Data = unknown> = {
  send(data: Partial<Data>): void
  closing?: Promise<void>
  [isAdapterSym]: true
} & ({
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg?(cb: (data: Partial<Data>) => void): UnsubscribeFunc
  msg(): Promise<Data> | Data
} | {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg(cb: (data: Partial<Data>) => void): UnsubscribeFunc
  msg?(): Promise<Data> | Data
})



export type SecondaryStoreAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg?(cb: (data: Partial<Data>) => void): UnsubscribeFunc
  send?(data: Partial<Data>): void
  msg(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}


export type PrimaryStoreAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg(cb: (data: Partial<Data>) => void): UnsubscribeFunc
  send(data: Partial<Data>): void
  msg(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}


export type Adapter<D = unknown> = SecondaryTransmissionAdapter<D> | SecondaryStoreAdapter<D>


type ExtendedAdapter<Adapter> = Adapter & {onMsg(cb: (data: Data) => void, once?: boolean): UnsubscribeFunc}

export function _empowerAdapter<Ad, Data>(adapter: Ad & Adapter<Data>): ExtendedAdapter<Ad> {
  const OGonMsg = adapter.onMsg
  if (OGonMsg !== undefined) adapter.onMsg = (cb: (data: Partial<Data>) => void, once: boolean = false) => {
    let OGunsub: UnsubscribeFunc
    if (once) {
      OGunsub = OGonMsg((data) => {
        unsubF()
        cb(data)
      })
    }
    else OGunsub = OGonMsg(cb)
    let unsubed = false
    const unsubF = () => {
      if (unsubed) return false
      OGunsub()
      unsubed = true
    }
    return unsubF
  }

  return adapter as any
}

const empowerAdapter = funcifyFunction(_empowerAdapter) as (<Ad, Data, Arg>(a: (a: Arg) => (Ad & Adapter<Data>)) => ((a: Arg) => ExtendedAdapter<Ad>)) & typeof _empowerAdapter




export function promifyFunction<Arg, Ret>(f: (a: Arg) => Ret) {
  function promify(a: Arg): Promise<Ret>
  function promify(a: Promise<Arg>): Promise<Ret>
  function promify(a: Arg | Promise<Arg>) {
    if (a instanceof Promise) return a.then((a) => f(a))
    else return f(a)
  }
  return promify
}


export function funcifyFunction<Arg, Ret>(f: (a: Arg) => Ret) {
  function funcify<MyArgs extends unknown[]>(a: Arg): Ret
  function funcify<MyArgs extends unknown[]>(a: Promise<Arg>): Promise<Ret>
  function funcify<MyArgs extends unknown[]>(a: (...args: MyArgs) => Arg): (...args: MyArgs) => Ret
  function funcify<MyArgs extends unknown[]>(a: Arg | Promise<Arg> | ((...args: MyArgs) => Arg)) {
    if (a instanceof Function) return (...args: MyArgs) => f(a(...args))
    else if (a instanceof Promise) return a.then((a) => f(a))
    else return f(a)
  }
  return funcify
}







export function fullyConnectedJosmAdapter<R extends SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>>(adapter: PrimaryTransmissionAdapter, __inpAdapter: R | ((initData: unknown) => R), isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Promise<void>
export function fullyConnectedJosmAdapter<R extends SecondaryTransmissionAdapter | Promise<SecondaryTransmissionAdapter>>(adapter: R | ((initData: unknown) => R), __inpAdapter: SecondaryStoreAdapter, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Promise<void>
export function fullyConnectedJosmAdapter(_outAdapter: PrimaryTransmissionAdapter | ((initData: unknown) => PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>), __inpAdapter: SecondaryStoreAdapter | ((initData: unknown) => (SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>)), _isInitiallyDominantDataSource?: boolean, _readOnly?: boolean | Data<boolean>): any {
  
  const outIsFunc = _outAdapter instanceof Function
  if (outIsFunc) {
    const msg = (__inpAdapter as SecondaryStoreAdapter).msg()
    const f = (msg: any) => {
      const ret = _outAdapter(msg)
      return ret instanceof Promise ? ret.then((ret) => {runWithOut(ret, {msg})}) : runWithOut(ret, {msg})
    }
    return msg instanceof Promise ? msg.then(f as any) : f(msg)
  }
  else return runWithOut(_outAdapter as PrimaryTransmissionAdapter)

  

  function runWithOut(_outAdapter: PrimaryTransmissionAdapter, inpMsg?: {msg: any}) {
    const outAdapter = empowerAdapter(_outAdapter)
    const isFunc = __inpAdapter instanceof Function
    const isInitiallyDominantDataSource: boolean = _isInitiallyDominantDataSource ?? !isFunc
    const readOnly: boolean | Data<boolean> = _readOnly ?? isInitiallyDominantDataSource
    const readOnlyData = typeof readOnly !== "boolean" ? readOnly : new Data(readOnly)
  
  
    if (isFunc) {
      // onMsg or msg must be defined here, as it is required in the type definition
      if (outAdapter.msg !== undefined) {
        const msg = outAdapter.msg()
        const f = (msg: SecondaryStoreAdapter) => {
          const ret = __inpAdapter(msg)
          ret instanceof Promise ? ret.then((r) => runWithInp(r, {msg})) : runWithInp(ret, {msg})
          // It is intentional that runWithInp is not awaited here, as it only resolves when inpAdapter has a msg rdy. Which will probably not happen if we have to wait for outAdapter to give us a init msg first.
          return ret
        }
        return msg instanceof Promise ? msg.then(f) : f(msg as SecondaryStoreAdapter)
      }
      else {
        return new Promise<void>(async (res) => {
          outAdapter.onMsg(async (msg) => {
            const ret = __inpAdapter(msg)
            runWithInp(ret instanceof Promise ? await ret : ret, {msg})
            // It is intentional that runWithInp is not awaited here, as it only resolves when inpAdapter has a msg rdy. Which will probably not happen if we have to wait for outAdapter to give us a init msg first.
            res()
          }, true)
        })
        
      }
    }
    else {
      runWithInp(__inpAdapter as SecondaryStoreAdapter)
    }
    
  
    function runWithInp (_inpAdapter: SecondaryStoreAdapter, outMsg?: {msg: any}) {
      let raceProms = [] as any[]
      const inpAdapter = empowerAdapter(_inpAdapter)
      if (isInitiallyDominantDataSource) {
        const msg = inpMsg !== undefined ? inpMsg.msg : inpAdapter.msg()
        raceProms.push(msg instanceof Promise ? msg.then((data) => outAdapter.send(data)) : outAdapter.send(msg))
      }

      
  
      let disabled = false
      if (inpAdapter.onMsg) {
        raceProms.push(new Promise((res) => {
          const unSub = inpAdapter.onMsg((msg) => {
            if (disabled) return
            disabled = true
            res(outAdapter.send(msg))
            disabled = false
          })
          if (outAdapter.closing) outAdapter.closing.then(() => {
            unSub()
          })
        }));
        
      }
      
  
      // this block is just for sending from outAdapter to inpAdapter, according to close state and readOnly state
      if (inpAdapter.send !== undefined && outAdapter.onMsg !== undefined) {
        const setToData = (data: any) => {
          if (disabled) return
          disabled = true
          inpAdapter.send(data)
          disabled = false
        }
        const inpAdapterClosed = new Data(false)
        if (inpAdapter.closing) inpAdapter.closing.then(() => {
          inpAdapterClosed.set(true)
        })
    
        const canListenToOutAdapter = new Data()
        new DataCollection(inpAdapterClosed, readOnlyData).get((inpClosed, readOnly) => {
          canListenToOutAdapter.set(!inpClosed && !readOnly)
        })
    
        let unsubscribeFromCurrentListener: UnsubscribeFunc = () => {}
        canListenToOutAdapter.get((canListen) => {
          if (canListen) unsubscribeFromCurrentListener = outAdapter.onMsg(setToData)
          else unsubscribeFromCurrentListener()
        })
      }

      return raceProms.some((p) => !(p instanceof Promise)) || raceProms.length === 0 ? undefined : Promise.race(raceProms)
    }
  }

  
}

export default fullyConnectedJosmAdapter


export function liberalizeAdapterMaker<Arg, Ret extends Adapter>(f: (arg: Arg) => Ret): (arg: Arg | Ret) => Ret {
  return (arg) => {
    if (arg[isAdapterSym]) return arg as Ret
    else return f(arg as Arg)
  }
}



const liberalDataBaseToAdapter = liberalizeAdapterMaker(dataBaseToAdapter)
const f_liberalDataBaseToAdapter = funcifyFunction(liberalDataBaseToAdapter)

// this needs to be treated seperatly and not by the funcify function, as DB is instanceof Function and we need to make a special check here, to distinguish these two.
function funcifiedAndLiberalizedDataBaseToAdapter(db: Adapter | Data | DataBase | ((initData: unknown) => Adapter | Data | DataBase) | Promise<Adapter | Data | DataBase>): PrimaryStoreAdapter {
  if (db[instanceTypeSym] === undefined) return f_liberalDataBaseToAdapter(db as any)
  else return liberalDataBaseToAdapter(db as Data | DataBase)
}


export function makeAdapterPair<Instance>(instanceToAdapterFunc: (instance: Instance) => (PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>)) {

  
  function josmAdapterServer<Dat extends Data | DataBase | SecondaryStoreAdapter>(instance: Instance, data_dataBase: Dat, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Promise<Dat>
  function josmAdapterServer<Dat extends Data | DataBase>(instance: Instance, data_dataBase: (initData: unknown) => Dat, readOnly?: boolean | Data<boolean>): Promise<Dat>
  async function josmAdapterServer<Dat extends Data | DataBase | SecondaryStoreAdapter>(instance: Instance, data_dataBase: Dat | ((initData: unknown) => Dat), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
    return fullyConnectedJosmAdapter(await instanceToAdapterFunc(instance), funcifiedAndLiberalizedDataBaseToAdapter(data_dataBase as Data | DataBase), isInitiallyDominantDataSource_readOnly as any, _readOnly)
  }

  function josmAdapterClient(p: Instance, readOnly: boolean | Data<boolean> = false): Promise<Data<any> | DataBase> {
    let db: Data<any> | DataBase
    return josmAdapterServer(p, (initData) => {
      return db = (typeof initData === "object" && initData !== null ? new DataBase(initData) : new Data(initData)) as Data | DataBase
    }, readOnly).then(() => db)
  }

  return {
    josmAdapterServer,
    josmAdapterClient
  }
}





