import { execQueue, CancelAblePromise } from "more-proms"
import { SimpleUniDB, UniDB, parseDataDiff } from "./lib";
import { defaultTransactionOptions } from "./lib";
import { promises as fs } from "fs"
import { encode, decode } from "circ-msgpack"
import path from "path"
import { memoize } from "key-index"
import cloneKeys from "circ-clone";


type FilePath = string

export async function fsToSimpleUniDB(filePath: FilePath): Promise<SimpleUniDB> {
  const stat = await fileExists(filePath)
  if (stat) {
    if (stat.isDirectory()) throw new Error("filePath is a directory")
  } 
  else {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, encode(undefined))
  }


  let tmpDataSet = false
  let tmpData: CancelAblePromise<any>
  let initTmpData: CancelAblePromise<any>


  

  function findOne() {
    if (!currentlyInTransaction) return CancelAblePromise.reject(new Error("not in transaction")) as CancelAblePromise<any>
    if (!tmpDataSet) {
      const abortController = new AbortController();
      initTmpData = new CancelAblePromise<any>(async (res, rej) => {
        let raw: any
        try {
          raw = await fs.readFile(filePath, { signal: abortController.signal })
        }
        catch(e) {
          if (e.name !== "AbortError") {
            rej(e)
          }
          else return
        }
        const obj = decode(raw)
        tmpDataSet = true

        res(obj)
      }, function cancel(reason) {
        abortController.abort(reason)
      }) as any
      tmpData = initTmpData.then((initTmpData) => cloneKeys(initTmpData), undefined, true)
      return tmpData
    }
    else {
      // we assume that the user of findOne awaits the last fineOne call before starting this one.
      return tmpData
    }
  }


  let writeHappened = false
  function updateOne(diff: { [key: string]: undefined | unknown }) {
    if (!currentlyInTransaction) return CancelAblePromise.reject(new Error("not in transaction")) as CancelAblePromise<any>
    writeHappened = true
    tmpData = findOne().then(tmpData => parseDataDiff(tmpData, diff), undefined, true)
    return tmpData
  }

  let currentlyInTransaction = false

  const runInQ = execQueue()
  // important this promise may never resolve, when it is canceled or skipped
  function transaction(f: () => Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>, options?: typeof defaultTransactionOptions) {
    options = {...defaultTransactionOptions, ...options}
    return runInQ(() => {
      currentlyInTransaction = true
      let fRes: Promise<void> | CancelAblePromise<void, string, Promise<void> | undefined>
      try {
        fRes = f()
      }
      catch(e) {
        return CancelAblePromise.reject(e)
      }

      
      const abortController = new AbortController()



      const abort = memoize(() => {
        tmpData = initTmpData
        currentlyInTransaction = false
      })
      const retProm = (fRes as CancelAblePromise).then(async (res) => {
        if (writeHappened) {
          try {
            await fs.writeFile(filePath, encode(await tmpData), { signal: abortController.signal })
            initTmpData = tmpData = undefined
            currentlyInTransaction = tmpDataSet = writeHappened = false
          }
          catch(e) {
            if (e.name !== "AbortError") {
              abort()
              throw e
            }
          }
        }
        return res
      }, (reason) => {
        abort()
        throw reason
      }, "cancel" in fRes ? async (reason) => {
        abortController.abort(reason)
        abort()
        await (fRes as CancelAblePromise<any, any, any>).cancel(reason)
      } : undefined)

      return retProm
    }, {skipAble: options.skipAble}, options.skipPrevIfPossible)
  }


  return {
    findOne,
    updateOne,
    transaction: transaction as any
  }
}


export async function fileExists(name: string) {
  try {
    const res = await fs.stat(name)
    return res
  }
  catch(e) {
    if (e.code === "ENOENT") return false
    throw e
  }
}