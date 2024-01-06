import { stringify, parse } from "circ-json"
import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";
import { WebSocket as NodeWebSocket } from "ws";
import { PrimaryTransmissionAdapter, makeAdapterPair, isAdapterSym } from "./fullyConnectedAdapter"



export function wsToAdapter(_ws: WebSocket | NodeWebSocket): Promise<PrimaryTransmissionAdapter> {
  const ws = _ws as NodeWebSocket
  const WebSocket = ws.constructor as any

  return new Promise<PrimaryTransmissionAdapter>((_res) => {
    function res() {
      _res({
        send(data) {
          ws.send(stringify(data))
        },
        onMsg(cb) {
          const listener: any = (ev: MessageEvent) => {
            if (ws.readyState !== WebSocket.OPEN) return
            cb(parse(ev.data))
          }
          ws.addEventListener("message", listener)
          return () => {
            try {
              ws.removeEventListener("message", listener)
              return true
            }
            catch(e) {
              return false
            }
          }
        },
        closing: new Promise((res) => {
          try {
            ws.addEventListener("closing" as any, res as any, {once: true})
          }
          catch(e){}
          
          ws.addEventListener("close", res as any, {once: true})
        }),
        [isAdapterSym]: true
      })
    }

    if (ws.readyState === WebSocket.OPEN) res()
    else ws.addEventListener("open", res as any, {once: true})
    
  })
  
}

export const { josmAdapterServer: websocketJosmAdapterServer, josmAdapterClient: websocketJosmAdapterClient } = makeAdapterPair(wsToAdapter)

