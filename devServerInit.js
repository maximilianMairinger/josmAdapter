const nodemon = require("nodemon")
const detectPort = require("detect-port")
const args = require("yargs").argv;
const path = require("path")
const open = require("open")
const waitOn = require("wait-on")



// configureable
const serverEntryFileName = "josmAdapter-replServer.js"
const serverDir = "repl/dist"







let serverEntryPath = path.join(serverDir, serverEntryFileName);




(async (wantedPort = 6500) => {




  console.log("")
  console.log("")
  console.log("Waiting for build to finish, before starting the server...")


  await waitOn({
    resources: [serverEntryPath]
  })


  let gotPort;
  try {
    gotPort = await detectPort(wantedPort)
  }
  catch(e) {
    console.error(e)
    return
  }
  

  

  


  

  
  let server = nodemon({
    watch: [],
    script: serverEntryPath,
    env: {
      port: gotPort
    }
  })

  server.on("restart", (e) => {
    console.log("")
    console.log("-----------------")
    console.log("Server restarting")
    console.log("-----------------")
    console.log("")
  })

  
  
  
  
  console.log("")
  console.log("")

  if (gotPort !== wantedPort) console.log(`Port ${wantedPort} was occupied, falling back to: http://127.0.0.1:${gotPort}.\n----------------------------------------------\n`)
  else console.log(`Serving on http://127.0.0.1:${gotPort}.\n---------------------\n`)

  
  
  console.log("Starting Browser")
  open(`http://127.0.0.1:${gotPort}`)
  
  
  
  
})(args.port)







