var Functions = {}

const CommandMap = new Map()
const ConsoleCommandMap = new Map()

Functions.RegisterCommand = function (command, callback) {
  CommandMap.set(command, callback)
}

Functions.RegisterConsoleCommand = function (command, callback) {
  ConsoleCommandMap.set(command, callback)
}

Functions.OnCommand = function (message, commandLine) {
  var args = commandLine.split(' ')
  var cmd = args.shift()
  if (!CommandMap.get(cmd)) return
  var func = CommandMap.get(cmd)
  if (func) func(message, cmd, args)
}

Functions.OnConsoleCommand = function (commandLine) {
  var args = commandLine.split(' ')
  var cmd = args.shift()
  if (!ConsoleCommandMap.get(cmd)) return
  var func = ConsoleCommandMap.get(cmd)
  if (func) func(cmd, args)
}

module.exports = Functions