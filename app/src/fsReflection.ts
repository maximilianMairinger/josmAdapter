import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { mkdirp } from "mkdirp"
import path from "path"
import { promises as fs } from "fs"
import { stringify, parse } from "circ-json" // move data storage to be binary based
import { ResablePromise } from "more-proms";



const exists = (filename: string) => fs.stat(filename).then(() => true).catch(() => false)



export async function fsToAdapter(fsPath: string): Promise<PrimaryTransmissionAdapter> {
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

  return {
    async msg() {
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
    },
    async send(data) {
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
  }
}



export const josmFsReflection = makeJosmReflection(fsToAdapter)
