import { parseDataDiff } from "./lib";
import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { stringify, parse } from "circ-json" // move this to binary



export function localStorageToAdapter(id: string) {

  function msg() {
    const storedData = localStorage.getItem(id)
    if (storedData === "undefined") return undefined
    if (storedData === null) return undefined
    return parse(storedData)
  }

  return {
    msg,
    send(diff: any) {
      const data = parseDataDiff(msg(), diff)
      // not setting undefined stays consistent. Then null will be read which gets forwarded as undefined above. Note that setting undefined here will result in "undefined" being in localStorage which is invalid JSON and throws on next read.
      if (data !== undefined) localStorage.setItem(id, stringify(data))
    },
    [isAdapterSym]: true
  } as const
}



export const josmLocalStorageReflection = makeJosmReflection(localStorageToAdapter)
