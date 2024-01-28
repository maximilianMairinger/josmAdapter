import { execQueue, CancelAblePromise } from "more-proms"
import { SimpleUniDB, UniDB, parseDataDiff } from "./lib";
import { defaultTransactionOptions } from "./lib";
import { promises as fs } from "fs"
import { encode, decode } from "circ-msgpack"
import path from "path"
import { incUIDScope, isBigintSupported, memoize } from "key-index"
import cloneKeys from "circ-clone";


type FilePath = string

export async function fsToSimpleUniDB(filePath: FilePath): Promise<SimpleUniDB> {
  const stat = await fileExists(filePath)
  if (stat) {
    if (stat.isDirectory()) throw new Error("filePath is a directory")
  } 
  else {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
  }


  let tmpDataSet = false
  let tmpData: Promise<unknown>
  let initTmpData: Promise<unknown>

  function findOne() {
    if (!currentlyInTransaction) return Promise.reject(new Error("not in transaction"))
    if (!tmpDataSet) {
      initTmpData = (async () => decode(await fs.readFile(filePath)))()
      tmpData = initTmpData.then((initTmpData) => cloneKeys(initTmpData))
      tmpDataSet = true
    }
    return tmpData
  }


  async function updateOne(diff: { [key: string]: undefined | unknown }) {
    if (!currentlyInTransaction) throw new Error("not in transaction")
    tmpData = parseDataDiff(await findOne(), diff)
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
      const retProm = (fRes as CancelAblePromise).then(async () => {
        try {
          await fs.writeFile(filePath, encode(tmpData), { signal: abortController.signal })
          initTmpData = tmpData = undefined
          currentlyInTransaction = tmpDataSet = false
        }
        catch(e) {
          if (e.name !== "AbortError") {
            abort()
            throw e
          }
        }
        
        
      }, () => {
        abort()
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