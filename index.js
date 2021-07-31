import { Worker } from "node:worker_threads"

const fileIndex = process.argv.findIndex(arg => arg === '--file') + 1
const file = process.argv[fileIndex]

const worker = new Worker(file)

worker.on('exit', (code) => {
  console.log(`Exit: ${code}`)
})
