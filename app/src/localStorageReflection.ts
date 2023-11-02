import { SecondaryStoreAdapter, isAdapterSym } from "./josmAdapter"
import { makeJosmReflection } from "./josmReflection";
import { stringify, parse } from "circ-json" // move this to binary



export function localStorageToAdapter(id: string): SecondaryStoreAdapter {

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
  }
}



export const josmLocalStorageReflection = makeJosmReflection(localStorageToAdapter)
