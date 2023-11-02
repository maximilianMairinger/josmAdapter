import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription, DataCollection } from "josm";
import { workerToAdapter } from "./workerAdapter"


// export type WebSocketUrl = string | URL 

export const isAdapterSym = Symbol("isAdaperSym")

type UnsubscribeFunc = () => void
export type TransmissionAdapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg(cb: (data: Data) => void): UnsubscribeFunc
  send(data: Data): void
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

// with onMsg required
export type PrimaryStoreAdapter<Data = unknown> = SecondaryStoreAdapter<Data> & {
  [key in keyof SecondaryStoreAdapter<Data> as "onMsg"]-?: SecondaryStoreAdapter<Data>[key]
} & {
  [key in keyof SecondaryStoreAdapter<Data> as "send"]-?: SecondaryStoreAdapter<Data>[key]
}



export type Adapter<D = unknown> = TransmissionAdapter<D> | SecondaryStoreAdapter<D>


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

type UnifiedDataAndBase = ((cb: (data: any) => void, init?: boolean) => (DataSubscription<[unknown]> | DataBaseSubscription<[unknown]>)) & (() => (unknown))

function _unifyDataAndDataBase(data_dataBase: Data<any> | DataBase): UnifiedDataAndBase {
  if (data_dataBase[instanceTypeSym] === "Data") {
    const data = data_dataBase as Data<any>
    return (cb?: (data: any) => void, init?: boolean) => {
      return data.get(cb, init)
    }
  }
  else {
    const dataBase = data_dataBase as DataBase
    return (cb?: (data: any) => void, init?: boolean) => {
      if (cb === undefined) return dataBase() as any
      return dataBase((fullData, diffData) => {
        cb(diffData)
      }, true, init) as any as DataBaseSubscription<[unknown]>
    }
  }
}

export const unifyDataAndDataBase = funcifyFunction(_unifyDataAndDataBase)


export function dataBaseToAdapter(dataBase: Data | DataBase): PrimaryStoreAdapter {
  const db = unifyDataAndDataBase(dataBase)

  return {
    onMsg(cb: (data: any) => void) {
      const sub = db(cb, false)
      return () => {
        sub.deactivate()
      }
    },
    send(data: any) {
      if (data[instanceTypeSym] === "Data") (dataBase as Data).set(data)      
      else {
        if (typeof data !== "object" || data === null) throw new Error("DataBase can only be set with an object");
        (dataBase as DataBase)(data)
      }
    },
    msg() {
      return db()
    },
    [isAdapterSym]: true
  }
}



export function fullyConnectedJosmAdapter(adapter: TransmissionAdapter | ((initData: unknown) => (TransmissionAdapter | Promise<TransmissionAdapter>)), __inpAdapter: SecondaryStoreAdapter, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): void
export function fullyConnectedJosmAdapter(adapter: TransmissionAdapter, __inpAdapter: SecondaryStoreAdapter | ((initData: unknown) => (SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>)), readOnly?: boolean | Data<boolean>): void
export function fullyConnectedJosmAdapter(_outAdapter: TransmissionAdapter | ((initData: unknown) => TransmissionAdapter | Promise<TransmissionAdapter>), __inpAdapter: SecondaryStoreAdapter | ((initData: unknown) => (SecondaryStoreAdapter | Promise<SecondaryStoreAdapter>)), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
  if (_outAdapter instanceof Function) {
    return (async () => {
      const msg = (__inpAdapter as SecondaryStoreAdapter).msg()
      const ret = msg instanceof Promise ? _outAdapter(await msg) : _outAdapter(msg)
      return runWithOut(ret instanceof Promise ? await ret : ret)
    })()
  }
  else return runWithOut(_outAdapter)

  function runWithOut(_outAdapter: TransmissionAdapter) {
    const outAdapter = empowerAdapter(_outAdapter)
    const isFunc = __inpAdapter instanceof Function && __inpAdapter[instanceTypeSym] !== "DataBase"
    const isInitiallyDominantDataSource: boolean = isFunc ? false : isInitiallyDominantDataSource_readOnly as boolean ?? true
    const readOnly: boolean | Data<boolean> = (isFunc ? isInitiallyDominantDataSource_readOnly ?? false : _readOnly ?? isInitiallyDominantDataSource) as boolean | Data<boolean>
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
      
  
      if (inpAdapter.send !== undefined) {
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
      outAdapter.onMsg(async (data) => {
        const ret = __inpAdapter(data)
        runWithInp(ret instanceof Promise ? await ret : ret)
      }, true)
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


export function makeAdapterPair<Instance>(instanceToAdapterFunc: (instance: Instance) => (TransmissionAdapter | Promise<TransmissionAdapter>)) {
  function josmAdapter<Dat extends Data | DataBase | SecondaryStoreAdapter>(instance: Instance, data_dataBase: Dat, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Promise<Dat>
  function josmAdapter<Dat extends Data | DataBase>(instance: Instance, data_dataBase: (initData: unknown) => Dat, readOnly?: boolean | Data<boolean>): Promise<Dat>
  async function josmAdapter<Dat extends Data | DataBase | SecondaryStoreAdapter>(instance: Instance, data_dataBase: Dat | ((initData: unknown) => Dat), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
    return fullyConnectedJosmAdapter(await instanceToAdapterFunc(instance), liberalDataBaseToAdapter(data_dataBase as Data | DataBase), isInitiallyDominantDataSource_readOnly as any, _readOnly)
  }

  function josmAdapterClient(p: Instance, readOnly: boolean | Data<boolean> = false): Promise<Data<any> | DataBase> {
    return josmAdapter(p, (initData) => {
      return (typeof initData === "object" && initData !== null ? new DataBase(initData) : new Data(initData)) as Data | DataBase
    }, readOnly)
  }

  return {
    josmAdapter,
    josmAdapterClient
  }
}





