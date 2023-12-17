import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { mkdirp } from "mkdirp"
import path from "path"
import { promises as fs } from "fs"
import { stringify, parse } from "circ-json" // move data storage to be binary based
import { ResablePromise } from "more-proms";
import { parseEscapedRecursion } from "./dataBaseAdapter";



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


  async function msg() {
    let storedData: unknown
    let rawStoredData: string

    try {
      storedData = parse(rawStoredData = await fs.readFile(fsPath, "utf8"))
    }
    catch(e) {
      if (fileExists) if (rawStoredData !== "") {
        const txt = "fsPath exists, but is not a valid json"
        closing.res(txt)
        throw new Error(txt)
      }
    }

    return storedData
  }

  return {
    msg,
    async send(dataDiff: any) {
      const data = parseDataDiff(await msg(), dataDiff)
      try {
        if (data === undefined) await fs.writeFile(fsPath, "", "utf8")
        else await fs.writeFile(fsPath, stringify(data), "utf8")
      }
      catch(e) {
        closing.res(e.message)
        throw e
      }
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
      const merge = parseEscapedRecursion(full)
      data = merge(diff)
    }
  }
  else data = diff
  return data
}


export const josmFsReflection = makeJosmReflection(fsToAdapter)
