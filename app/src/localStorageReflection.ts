import { parseDataDiff } from "./lib";
import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
// circ-json doesnt support undefined!!!! I think this is ok though, as this is only used as reflection.
import { stringify, parse } from "circ-json" // cant use msgpack because. local storage is string only and I did not find a good way to encode binary to string. Use indexDBAdapter instead



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
