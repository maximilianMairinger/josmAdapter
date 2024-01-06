import { merge } from "webpack-merge"
import commonMod from "./rollup.node.common.config.mjs"


export default merge(commonMod, {
  input: './repl/src/replServer.ts',
  output: {
    file: 'repl/dist/josmAdapter-replServer.js'
  },
  watch: {
    include: ['app/src/**', "repl/src/**"],
    exclude: 'node_modules/**'
  }
})
