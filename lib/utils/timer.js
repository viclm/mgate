let id = null
let tasks = []

function tick() {
  if (id) {
    return
  }
  id = setInterval(run, 1000)
}

function stop() {
  if (id) {
    clearInterval(id)
    id = null
  }
}

function run() {
  for (let i = 0 ; i < tasks.length ; i++) {
    let task = tasks[i]
    task.remain--
    if (task.remain === 0) {
      task.callback.call()
      tasks.splice(i, 1)
      i--
    }
  }
  if (tasks.length === 0) {
    stop()
  }
}

exports.delay = function delay(seconds, callback) {
  tasks.push({
    remain: seconds,
    callback
  })
  tick()
}

exports.running = function running() {
  return !!id
}
