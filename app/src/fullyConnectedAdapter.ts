import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription, DataCollection } from "josm";
import { cloneKeys } from "circ-clone"

// export type WebSocketUrl = string | URL 

export const isAdapterSym = Symbol("isAdaperSym")

type UnsubscribeFunc = () => void
export type SecondaryTransmissionAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg?(cb: (data: Data) => void): UnsubscribeFunc
  send(data: Data): void
  msg?(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}


export type PrimaryTransmissionAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg?(cb: (data: Data) => void): UnsubscribeFunc
  send(data: Data): void
  msg(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
} | {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg(cb: (data: Data) => void): UnsubscribeFunc
  send(data: Data): void
  msg?(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}




export type SecondaryStoreAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg?(cb: (data: Data) => void): UnsubscribeFunc
  send?(data: Data): void
  msg(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}


export type PrimaryStoreAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg(cb: (data: Data) => void): UnsubscribeFunc
  send(data: Data): void
  msg(): Promise<Data> | Data
  closing?: Promise<void>
  [isAdapterSym]: true
}


export type Adapter<D = unknown> = SecondaryTransmissionAdapter<D> | SecondaryStoreAdapter<D>


type ExtendedAdapter<Adapter> = Adapter & {onMsg(cb: (data: Data) => void, once?: boolean): UnsubscribeFunc}

function _empowerAdapter<Ad, Data>(adapter: Ad & Adapter<Data>): ExtendedAdapter<Ad> {
  const OGonMsg = adapter.onMsg
  if (OGonMsg !== undefined) adapter.onMsg = (cb: (data: Data) => void, once: boolean = false) => {
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





function funcifyFunction<Arg, Ret>(f: (a: Arg) => Ret) {
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

type UnifiedDataAndBase = {
  get: ((cb: (data: any) => void, init?: boolean) => (DataSubscription<[unknown]> | DataBaseSubscription<[unknown]>)) & (() => (unknown)),
  set: (val: any) => void
}

function unifyDataAndDataBase(data_dataBase: Data<any> | DataBase): UnifiedDataAndBase {
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


export function dataBaseToAdapter(dataBase: Data | DataBase): PrimaryStoreAdapter {
  const db = unifyDataAndDataBase(dataBase)

  return {
    onMsg(cb: (data: any) => void) {
      const sub = db.get(cb, false)
      return () => {
        sub.deactivate()
      }
    },
    send(data: any) {
      db.set(data)
    },
    msg() {
      return cloneKeys(db.get() as object)
    },
    [isAdapterSym]: true
  }
}


export function fullyConnectedJosmAdapter(adapter: PrimaryTransmissionAdapter, __inpAdapter: SecondaryStoreAdapter | ((initData: unknown) => (SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>)), isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): void
export function fullyConnectedJosmAdapter(adapter: SecondaryTransmissionAdapter | ((initData: unknown) => (SecondaryTransmissionAdapter | Promise<SecondaryTransmissionAdapter>)), __inpAdapter: SecondaryStoreAdapter, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): void
export function fullyConnectedJosmAdapter(_outAdapter: PrimaryTransmissionAdapter | ((initData: unknown) => PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>), __inpAdapter: SecondaryStoreAdapter | ((initData: unknown) => (SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>)), _isInitiallyDominantDataSource?: boolean, _readOnly?: boolean | Data<boolean>) {
  const outIsFunc = _outAdapter instanceof Function
  if (outIsFunc) {
    const msg = (__inpAdapter as SecondaryStoreAdapter).msg()
    const f = (msg) => {
      const ret = _outAdapter(msg)
      return ret instanceof Promise ? ret.then(runWithOut) : runWithOut(ret)
    }
    return msg instanceof Promise ? msg.then(f) : f(msg)
  }
  else return runWithOut(_outAdapter)

  function runWithOut(_outAdapter: PrimaryTransmissionAdapter) {
    const outAdapter = empowerAdapter(_outAdapter)
    const isFunc = __inpAdapter instanceof Function && __inpAdapter[instanceTypeSym] !== "DataBase"
    const isInitiallyDominantDataSource: boolean = _isInitiallyDominantDataSource ?? !isFunc
    const readOnly: boolean | Data<boolean> = _readOnly ?? isInitiallyDominantDataSource
    const readOnlyData = typeof readOnly !== "boolean" ? readOnly : new Data(readOnly)
  
  
  
    const sendFunc = (data: any) => {
      outAdapter.send(data)
    }
  
    const runWithInp = (_inpAdapter: SecondaryStoreAdapter) => {
      const inpAdapter = empowerAdapter(_inpAdapter)
      if (isInitiallyDominantDataSource) {
        const msg = inpAdapter.msg()
        if (msg instanceof Promise) {
          msg.then((data) => {
            sendFunc(data)
          })
        }
        else sendFunc(msg)
      }
  
      let disabled = false
      if (inpAdapter.onMsg) {
        const unSub = inpAdapter.onMsg((msg) => {
          if (disabled) return
          sendFunc(msg)
        })
        if (outAdapter.closing) outAdapter.closing.then(() => {
          unSub()
        })
      }
      
  
      // this block is just for sending from inpAdapter to outAdapter, according to close state and readOnly state
      if (inpAdapter.send !== undefined && outAdapter.onMsg !== undefined) {
        const setToData = (data: any) => {
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
    }
  
    if (isFunc) {
      // onMsg or msg must be defined here, as it is required in the type definition
      if (outAdapter.msg !== undefined) {
        const msg = outAdapter.msg()
        const f = (msg: SecondaryStoreAdapter) => {
          const ret = __inpAdapter(msg)
          if (ret instanceof Promise) ret.then((r) => runWithInp(r))
          else runWithInp(ret)
        }
        if (msg instanceof Promise) msg.then(f)
        else f(msg as SecondaryStoreAdapter)
      }
      else {
        outAdapter.onMsg(async (data) => {
          const ret = __inpAdapter(data)
          runWithInp(ret instanceof Promise ? await ret : ret)
        }, true)
      }
    }
    else {
      runWithInp(__inpAdapter as SecondaryStoreAdapter)
    }
  }

  
}

export default fullyConnectedJosmAdapter


function liberalizeAdapterMaker<Arg, Ret extends Adapter>(f: (arg: Arg) => Ret): (arg: Arg | Ret) => Ret {
  return (arg) => {
    if (arg[isAdapterSym]) return arg as Ret
    else return f(arg as Arg)
  }
}

const liberalDataBaseToAdapter = funcifyFunction(liberalizeAdapterMaker(dataBaseToAdapter))


export function makeAdapterPair<Instance>(instanceToAdapterFunc: (instance: Instance) => (PrimaryTransmissionAdapter | Promise<PrimaryTransmissionAdapter>)) {
  function josmAdapterServer<Dat extends Data | DataBase | SecondaryStoreAdapter>(instance: Instance, data_dataBase: Dat, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Promise<Dat>
  function josmAdapterServer<Dat extends Data | DataBase>(instance: Instance, data_dataBase: (initData: unknown) => Dat, readOnly?: boolean | Data<boolean>): Promise<Dat>
  async function josmAdapterServer<Dat extends Data | DataBase | SecondaryStoreAdapter>(instance: Instance, data_dataBase: Dat | ((initData: unknown) => Dat), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
    return fullyConnectedJosmAdapter(await instanceToAdapterFunc(instance), liberalDataBaseToAdapter(data_dataBase as Data | DataBase), isInitiallyDominantDataSource_readOnly as any, _readOnly)
  }

  function josmAdapterClient(p: Instance, readOnly: boolean | Data<boolean> = false): Promise<Data<any> | DataBase> {
    return josmAdapterServer(p, (initData) => {
      return (typeof initData === "object" && initData !== null ? new DataBase(initData) : new Data(initData)) as Data | DataBase
    }, readOnly)
  }

  return {
    josmAdapterServer,
    josmAdapterClient
  }
}





