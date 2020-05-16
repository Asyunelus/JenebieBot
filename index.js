const Discord = require('discord.js')
const fs = require('fs')
const utf8 = require('utf8')
const request = require('request')
const cheerio = require('cheerio')
const https = require('https')
const Cookie = require('request-cookies')
const schedule = require('node-schedule')
const Readline = require('readline')

const UserManager = require('./modules/user-manager')
const CommandManager = require('./modules/command-manager')
const MusicManager = require('./modules/musicplayer')
const StockGame = require('./modules/stock-game')

const client = new Discord.Client()
const UserData = new Map()

const { prefix, token, songPath } = require('./config/config.json')

//CommandRegister
CommandManager.RegisterCommand('music', (message, cmd, args) => {
  switch (!args[0] ? 'help' : args[0]) {
    case 'help':
      var helpMessage = '음악 명령어 목록\n```'
      helpMessage += prefix + cmd + ' help : 도움말을 봅니다.\n'
      helpMessage += prefix + cmd + ' summon : 봇을 음성채팅에 소환합니다.\n'
      helpMessage += prefix + cmd + ' kick : 봇을 음성채팅에서 내쫓습니다.\n'
      helpMessage +=
        prefix + cmd + ' add <link> : 오디오를 재생목록에 추가합니다.\n'
      helpMessage += prefix + cmd + ' play : 음악을 재생합니다.\n'
      helpMessage += prefix + cmd + ' now : 현재 재생중인 음악을 봅니다.\n'
      helpMessage +=
        prefix + cmd + ' skip : 현재 듣고 있는 음악을 건너뜁니다.\n'
      helpMessage += prefix + cmd + ' queue : 현재 재생목록을 봅니다.\n'
      helpMessage +=
        prefix + cmd + ' stop : 모든 음악을 정지하고 재생목록을 비웁니다.\n'
      helpMessage +=
        prefix +
        cmd +
        ' pack <숫자> : 특정 음악팩을 재생목록에 전부 추가합니다.\n'
      helpMessage +=
        prefix +
        cmd +
        ' repeat : 반복 여부입니다. 음악 반복모드가 켜져있을경우, 재생이 완료되어도 재생목록에서 삭제되지 않고 재생목록의 맨 뒤로 이동됩니다.\n'
      helpMessage += '```'
      return message.channel.send(helpMessage).then(msg => {
        msg.delete({ timeout: 15000 })
      })
    case 'packlist':
      var page = 1
      if (args[1] && !isNaN(args[1])) page = args[1]
      return MusicManager.ShowPackList(message, page)
    case 'summon':
      return MusicManager.BotSummon(message)
    case 'kick':
      return MusicManager.BotKick(message)
    case 'add':
    if (!args[1]) return message.channel.send('링크를 입력해주세요!')
      return MusicManager.MusicAdd(message, args[1])
    case 'play':
      return MusicManager.MusicPlay(message)
    case 'skip':
      return MusicManager.MusicSkip(message)
    case 'stop':
      return MusicManager.MusicStop(message)
    case 'queue':
      return MusicManager.MusicQueue(message)
    case 'pack':
      return MusicManager.MusicPack(
        message,
        args[1] && !isNaN(args[1]) ? args[1] : 0
      )
    case 'repeat':
      return MusicManager.MusicRepeat(message)
    case 'now':
      return MusicManager.SongInfo(message)
    case 'volume':
      return MusicManager.MusicVolume(
        message,
        args[1] && !isNaN(args[1]) ? args[1] : -1
      )
  }
})

CommandManager.RegisterCommand('stock', (message, cmd, args) => {
  switch (!args[0] ? 'help' : args[0]) {
    case 'help':
      var helpMessage = '주식 미니게임 명령어 목록\n```'
      helpMessage += prefix + cmd + ' help : 도움말을 봅니다.\n'
      helpMessage += prefix + cmd + ' myinfo : 내 미니게임 정보를 봅니다.\n'
      helpMessage +=
        prefix +
        cmd +
        ' buy <종목번호> <수량> : 주식을 구매합니다. (0.25퍼 수수료)\n'
      helpMessage +=
        prefix +
        cmd +
        ' sell <종목번호> <수량> : 주삭을 판매합니다. (0.25퍼 수수료)\n'
      helpMessage += prefix + cmd + ' now : 현재 주가를 봅니다.\n'
      helpMessage += '```'
      return message.channel.send(helpMessage).then(msg => {
        msg.delete({ timeout: 15000 })
      })
    case 'myinfo':
      return StockGame.StockInfo(message)
  }
})

CommandManager.RegisterCommand('test', (message, cmd, args) => {
  message.channel.send('test command')
})

CommandManager.RegisterConsoleCommand('test', (message, cmd, args) => {
  console.log('test command')
})

//Core
var Prompt = Readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

Prompt.setPrompt('> ')
Prompt.on('line', function (line) {
  CommandManager.OnConsoleCommand(line)
  Prompt.prompt()
})

Prompt.on('close', function () {
  process.exit()
})

client.once('ready', () => {
  UserManager.LoadAll()
  console.log('Ready!')
  MusicManager.LoadCachedData()
  Prompt.prompt()
})

client.once('reconnecting', () => {
  console.log('Reconnecting!')
})

client.once('disconnect', () => {
  console.log('Disconnect!')
})

client.on('message', async message => {
  if (message.author.bot) return
  if (!message.content.startsWith(prefix)) return
  CommandManager.OnCommand(message, message.content.substring(1))
})

client.login(token)
