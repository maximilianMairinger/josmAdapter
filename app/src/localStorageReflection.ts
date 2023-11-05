import { PrimaryTransmissionAdapter, SecondaryStoreAdapter, isAdapterSym } from "./fullyConnectedAdapter"
import { makeJosmReflection } from "./josmReflection";
import { stringify, parse } from "circ-json" // move this to binary



export function localStorageToAdapter(id: string) {

  return {
    msg() {
      const storedData = localStorage.getItem(id)
      if (storedData === null) return undefined
      return parse(storedData) 
    },
    send(data) {
      localStorage.setItem(id, stringify(data))
    },
    [isAdapterSym]: true
  } as const
}



export const josmLocalStorageReflection = makeJosmReflection(localStorageToAdapter)
