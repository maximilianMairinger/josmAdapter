import { parseDataDiff } from "./fsReflection";
import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { stringify, parse } from "circ-json" // move this to binary



export function localStorageToAdapter(id: string) {

  function msg() {
    const storedData = localStorage.getItem(id)
    if (storedData === null) return undefined
    return parse(storedData) 
  }

  return {
    msg,
    send(diff: any) {
      const data = parseDataDiff(msg(), diff)
      localStorage.setItem(id, stringify(data))
    },
    [isAdapterSym]: true
  } as const
}



export const josmLocalStorageReflection = makeJosmReflection(localStorageToAdapter)
