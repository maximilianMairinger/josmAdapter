import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";
import { fullyConnectedJosmAdapter, PrimaryTransmissionAdapter, makeAdapterPair, isAdapterSym } from "./fullyConnectedAdapter"

type Work = Omit<Worker, "terminate" | "onmessage" | "onmessageerror" | "onerror">

export function workerToAdapter(worker: Work): PrimaryTransmissionAdapter {
  return {
    send(data) {
      worker.postMessage(data)
    },
    onMsg(cb) {
      const listener = (ev: MessageEvent) => {
        cb(ev.data)
      }
      worker.addEventListener("message", listener)
      return () => {
        try {
          worker.removeEventListener("message", listener)
          return true
        }
        catch(e) {
          return false
        }
      }
    },
    closing: new Promise((res) => {
      worker.addEventListener("error", res as any, {once: true})
      worker.addEventListener("messageerror", res as any, {once: true})
    }),
    [isAdapterSym]: true
  }
}

export const { josmAdapterServer: workerJosmAdapterServer, josmAdapterClient: workerJosmAdapterClient } = makeAdapterPair(workerToAdapter)


