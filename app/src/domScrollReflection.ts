import { SecondaryStoreAdapter, isAdapterSym } from "./josmAdapter"
import { makeJosmReflection } from "./josmReflection";
import { EventListener } from "extended-dom"
import LinkedList from "fast-linked-list";




export function scrollReflection({target, dir}: {target: Element, dir: "x" | "y"}): SecondaryStoreAdapter {
  const ls = new LinkedList<(data: unknown) => void>()

  const isX = dir === "x"

  target.on("scroll", (e) => {
    for (const cb of ls) cb(e.progress[dir])
  }, {direction: dir})

  return {
    onMsg(cb) {
      const tok = ls.push(cb)
      return tok.rm.bind(tok)
    },
    send(v: number) {
      target[isX ? "scrollLeft" : "scrollTop"] = v
    },
    msg() {
      return isX ? target.scrollLeft : target.scrollTop
    },
    [isAdapterSym]: true
  }
}



export const josmScrollReflection = makeJosmReflection(scrollReflection)
