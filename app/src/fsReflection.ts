import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { mkdirp } from "mkdirp"
import path from "path"
import { promises as fs } from "fs"
import { encode, decode } from "circ-msgpack"
import { ResablePromise } from "more-proms";
import { parseEscapedRecursion } from "./dataBaseAdapter";
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

    try {
      storedData = encode(await fs.readFile(fsPath))
    }
    catch(e) {
      if (await exists(fsPath)) {
        const txt = "fsPath exists, but is well formatted. Error msg: " + e.message
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
        const binary = encode(data)
        await fs.writeFile(fsPath, binary, { signal: abortFsWrite.signal })
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


export function parseDataDiff(full: any, diff: any) {
  let data: any
  if (typeof diff === "object" && diff !== null) { 
    if (typeof full !== "object" || full === null) data = diff
    else {
      data = parseEscapedRecursion(full, diff, false)
      
    }
  }
  else data = diff
  return data
}




export const josmFsReflection = makeJosmReflection(fsToAdapter)
