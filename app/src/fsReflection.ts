import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { mkdirp } from "mkdirp"
import path from "path"
import { promises as fs } from "fs"
import { stringify, parse } from "circ-json" // move data storage to be binary based
import { ResablePromise } from "more-proms";
import { parseDataDiff } from "./lib";
import clone, { mergeKeysDeep } from "circ-clone"


const exists = (filename: string) => fs.stat(filename).then(() => true).catch(() => false)



export async function fsToAdapter(fsPath: string) {
  const closing = new ResablePromise<string>()
  closing.then((reason) => {
    console.error("closing fsAdapter:", reason)
  })

  let fileExists: boolean
  try {
    await mkdirp(path.dirname(fsPath))

    fileExists = await exists(fsPath)
    if (fileExists && (await fs.stat(fsPath)).isDirectory()) {
      new Error("fsPath is a directory")
    }
  }
  catch(e) {
    closing.res(e.message)
  }

  let abortFsWrite: AbortController
  let currentlyWriting: Symbol = undefined
  let tempFullStorage: Promise<any>
  let tempDiffStorage: any


  async function msg() {
    if (currentlyWriting) return tempFullStorage
    let storedData: unknown
    let rawStoredData: string

    try {
      storedData = parse(rawStoredData = await fs.readFile(fsPath, "utf8"))
    }
    catch(e) {
      if (await exists(fsPath)) if (rawStoredData !== "") {
        const txt = "fsPath exists, but is not a valid json"
        closing.res(txt)
        throw new Error(txt)
      }
    }

    return storedData
  }

  return {
    msg,
    async send(_dataDiff: any) {
      let dataDiff = clone(_dataDiff)
      if (currentlyWriting) {
        abortFsWrite.abort()
        mergeKeysDeep(dataDiff, tempDiffStorage)
      }
      abortFsWrite = new AbortController()

      const stored = tempDiffStorage = msg()
      const mySym = currentlyWriting = Symbol()
      tempDiffStorage = dataDiff
      tempFullStorage = stored.then((stored) => parseDataDiff(stored, dataDiff))
      const data = await tempFullStorage
      if (mySym !== currentlyWriting) return 
      

      try {
        const str = data === undefined ? "" : stringify(data) 
        await fs.writeFile(fsPath, str, { signal: abortFsWrite.signal, encoding: "utf8" })
      }
      catch(e) {
        if (e.name !== "AbortError") {
          closing.res(e.message)
          throw e
        }
      }
      if (mySym === currentlyWriting) currentlyWriting = undefined
    },
    closing: closing as Promise<any>,
    [isAdapterSym]: true
  } as const
}







export const josmFsReflection = makeJosmReflection(fsToAdapter)
