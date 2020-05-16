const ytdl = require('ytdl-core')
const { getInfo } = require('ytdl-getinfo')
const fs = require('fs')
const { prefix, token, songPath } = require('../config/config.json')
const MusicPackData = JSON.parse(fs.readFileSync('./config/musicpack.json'))
const schedule = require('node-schedule')

const queue = new Map()
var PackCache = new Map()

var Functions = {}

var job = schedule.scheduleJob('*/2 * * * * *', function () {
  queue.forEach(element => {
    if (element.lastDurTxt !== null) {
      element.lastDurTxt.edit(Functions.FormatSongText(element))
    }
  })
})

Functions.LoadCachedData = function () {
  if (fs.existsSync('./cached.json')) {
    var datas = JSON.parse(fs.readFileSync('./cached.json'))
    var strMap = new Map()
    for (var k of Object.keys(datas)) {
      strMap.set(parseInt(k), datas[k])
    }
    PackCache = strMap
  }
}

Functions.SaveCachedData = function () {
  var datas = JSON.stringify(Object.fromEntries(PackCache))
  fs.writeFileSync('./cached.json', datas)
}

Functions.FormatTimeText = function (time) {
  var min = Math.floor(time / 60)
  var sec = Math.floor(time % 60)

  return (
    (min < 10 ? '0' + min.toString() : min.toString()) +
    ':' +
    (sec < 10 ? '0' + sec.toString() : sec.toString())
  )
}

Functions.FormatSongText = function (serverQueue) {
  if (serverQueue.songs.length <= 0) return 'Now Playing - Nothing'
  var nowDuration = serverQueue.songs[0].duration
  var nowTime = serverQueue.dispatcher.totalStreamTime / 1000
  var nowGauge = nowTime / nowDuration
  var nowmsg =
    'Now Playing - ' +
    serverQueue.songs[0].title +
    ' [' +
    Functions.FormatTimeText(nowTime) +
    '/' +
    Functions.FormatTimeText(nowDuration) +
    ']'
  nowmsg += '\n'
  for (var i = 0; i < 30; ++i) {
    var nowV = i / 30
    nowmsg += nowV <= nowGauge ? '█' : '░'
  }
  return nowmsg
}

Functions.SongInfo = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  if (!queue.get(id).dispatcher)
    return message.channel.send('음악이 재생중이지 않습니다.').then(msg => {
      msg.delete({ timeout: 15000 })
    })
  var serverQueue = queue.get(id)
  return message.channel
    .send(Functions.FormatSongText(serverQueue))
    .then(msg => {
      if (serverQueue.lastDurTxt) {
        serverQueue.lastDurTxt.delete()
      }
      serverQueue.lastDurTxt = msg
    })
}

Functions.BotSummon = async function (message) {
  var voiceChannel = message.member.voice.channel

  if (!voiceChannel)
    return message.channel
      .send('보이스챗에 입장한 뒤 명령어를 사용해주세요.')
      .then(msg => {
        msg.delete({ timeout: 15000 })
      })
  const voicePerm = voiceChannel.permissionsFor(message.client.user)
  if (!voicePerm.has('CONNECT') || !voicePerm.has('SPEAK'))
    return message.channel
      .send('보이스챗에 연결할 권한이 없습니다!')
      .then(msg => {
        msg.delete({ timeout: 15000 })
      })

  var id = message.guild.id
  if (!queue.get(id)) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      dispatcher: null,
      songs: [],
      volume: 50,
      playing: true,
      repeating: false,
      lastDurTxt: null
    }
    try {
      queueConstruct.connection = await voiceChannel.join()
      queue.set(id, queueConstruct)
    } catch (err) {
      message.channel.send('오류가 발생하였습니다!.').then(msg => {
        msg.delete({ timeout: 1500 })
      })
    }
  }
}

Functions.BotKick = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  Functions.MusicStop(message)
  queue.get(id).connection.disconnect()
  queue.delete(id)
}

Functions.MusicPlay = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  const serverQueue = queue.get(id)
  if (serverQueue.songs.length <= 0) {
    if (serverQueue.lastDurTxt) serverQueue.lastDurTxt.delete()
    serverQueue.lastDurTxt = null
    serverQueue.dispatcher = null
    return
  }
  var song = serverQueue.songs[0]

  var rifstream = fs.createReadStream(songPath + song.id + '.webm')

  serverQueue.dispatcher = serverQueue.connection.play(rifstream)
  serverQueue.dispatcher
    .on('finish', () => {
      rifstream.destroy()
      Functions.MusicSkip(message)
    })
    .on('error', err => {
      console.log(err)
    })
  if (serverQueue.dispatcher)
    serverQueue.dispatcher.setVolumeLogarithmic(serverQueue.volume / 100)
}

Functions.MusicStop = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  if (!queue.get(id).dispatcher)
    return message.channel
      .send('현재 음악을 재생하고 있지 않습니다!')
      .then(msg => {
        msg.delete({ timeout: 1500 })
      })
  const serverQueue = queue.get(id)
  if (serverQueue.lastDurTxt) serverQueue.lastDurTxt.delete()
  serverQueue.lastDurTxt = null
  serverQueue.songs = []
  if (serverQueue.dispatcher) {
    serverQueue.dispatcher.end()
    serverQueue.dispatcher = null
  }
}

Functions.MusicVolume = function (message, volume) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  if (!queue.get(id).dispatcher)
    return message.channel
      .send('현재 음악을 재생하고 있지 않습니다!')
      .then(msg => {
        msg.delete({ timeout: 1500 })
      })
  if (isNaN(volume) || volume < 0 || volume > 100)
    return message.channel
      .send('볼륨은 0 ~ 100 사이의 숫자로 설정해야 합니다.')
      .then(msg => {
        msg.delete({ timeout: 1500 })
      })

  queue.get(id).volume = volume
  queue.get(id).dispatcher.setVolumeLogarithmic(volume / 100)
  return message.channel
    .send('음악 볼륨이 ' + volume + '(으)로 설정되었습니다.')
    .then(msg => {
      msg.delete({ timeout: 1500 })
    })
}

Functions.MusicRepeat = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  queue.get(id).repeating = !queue.get(id).repeating
  return message.channel
    .send(
      '음악 반복재생모드가 ' +
        (queue.get(id).repeating ? '켜졌습니다.' : '꺼졌습니다.')
    )
    .then(msg => {
      msg.delete({ timeout: 3000 })
    })
}

Functions.MusicSkip = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  const serverQueue = queue.get(id)
  if (!serverQueue.repeating) {
    serverQueue.songs.shift()
  } else {
    var p1 = serverQueue.songs.shift()
    serverQueue.songs.push(p1)
  }

  Functions.MusicPlay(message)
}

Functions.MusicQueue = function (message) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  const serverQueue = queue.get(id)
  var msg = '음악 대기열 목록 (총 ' + serverQueue.songs.length + '개)'
  msg += '\n ```'
  if (serverQueue.songs.length <= 0) msg += '대기열 목록이 비어있습니다.'
  for (var i = 0; i < 10; i++) {
    if (i >= serverQueue.songs.length) break
    msg += '[' + i + '] ' + serverQueue.songs[i].title + '\n'
  }
  if (serverQueue.songs.length > 10)
    msg += '그 이외 ' + (serverQueue.songs.length - 10) + '개의 노래'
  msg += '```'
  return message.channel.send(msg).then(msg => {
    msg.delete({ timeout: 15000 })
  })
}

Functions.MusicAdd = async function (message, url) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  var cachedSongs = await Functions.MusicCache(message, url)
  for (var i in cachedSongs) {
    queue.get(id).songs.push(cachedSongs[i])
  }

  return message.channel.send(
    '총 ' + cachedSongs.length + '개의 음악이 추가되었습니다!'
  )
}

Functions.MusicCache = async function (message, url) {
  const songInfo = await getInfo(url)
  if (!songInfo) {
    if (!message) return
    return message.channel
      .send('음악을 재생하는데 있어 오류가 발생하였습니다!')
      .then(msg => {
        msg.delete({ timeout: 3000 })
      })
  }

  var cachedSongs = []

  for (var i = 0; i < songInfo.items.length; ++i) {
    const song = {
      title: songInfo.items[i].title,
      url: songInfo.items[i].webpage_url,
      id: songInfo.items[i].display_id,
      duration: songInfo.items[0].duration
    }

    cachedSongs.push(Functions.CacheMusicFile(song))
  }

  return cachedSongs
}

Functions.ShowPackList = function (message, page) {
  var maxPage = Math.ceil(MusicPackData.length / 10)
  var curPage = page
  if (curPage < 1) curPage = 1
  else if (curPage > maxPage) curPage = maxPage
  var listmsg = '음악팩 목록 (' + curPage + '/' + maxPage + ')\n```'
  var startIndex = (curPage - 1) * 10
  for (var i = startIndex; i < startIndex + 10; ++i) {
    if (i >= MusicPackData.length) continue
    listmsg +=
      '[Pack #' +
      (i + 1) +
      '] ' +
      MusicPackData[i].name +
      ' (' +
      MusicPackData[i].musics.length +
      '곡 수록)\n'
  }
  listmsg += '```'
  return message.channel.send(listmsg).then(msg => {
    msg.react('⏪').then(r => {
      msg.react('⏩').then(r => {
        msg.react('❌').then(r => {
          var forwardsFilter = msg.createReactionCollector(
            (reaction, user) =>
              reaction.emoji.name === '⏩' &&
              user.id === message.member.user.id,
            { time: 120000, max: 1 }
          )
          var backFilter = msg.createReactionCollector(
            (reaction, user) =>
              reaction.emoji.name === '⏪' &&
              user.id === message.member.user.id,
            { time: 120000, max: 1 }
          )

          var CloseFilter = msg.createReactionCollector(
            (reaction, user) =>
              reaction.emoji.name === '❌' &&
              user.id === message.member.user.id,
            { time: 120000, max: 1 }
          )

          forwardsFilter.on('collect', r => {
            msg.delete()
            Functions.ShowPackList(message, curPage + 1)
          })
          backFilter.on('collect', r => {
            msg.delete()
            Functions.ShowPackList(message, curPage - 1)
          })
          CloseFilter.on('collect', r => {
            msg.delete()
          })
          forwardsFilter.on('end', r => {})
          backFilter.on('end', r => {})
          CloseFilter.on('end', r => {})
        })
      })
    })
  })
}

Functions.MusicPack = async function (message, packID) {
  var id = message.guild.id
  if (!queue.get(id))
    return message.channel.send('현재 봇이 음성채팅에 없습니다!').then(msg => {
      msg.delete({ timeout: 1500 })
    })
  if (isNaN(packID))
    return message.channel
      .send('음악팩의 정확한 번호를 입력해주세요!')
      .then(msg => {
        msg.delete({ timeout: 3000 })
      })
  if (packID < 1 || packID > MusicPackData.length)
    return message.channel
      .send('입력한 번호에 해당하는 음악팩이 없습니다!')
      .then(msg => {
        msg.delete({ timeout: 3000 })
      })
  message.channel.send(
    '음악팩 로딩 시작 (' + MusicPackData[packID - 1].name + ')'
  )
  var cached = await Functions.CacheMusicPack(MusicPackData[packID - 1])
  for (var i in cached) {
    queue.get(message.guild.id).songs.push(cached[i])
  }

  return message.channel.send(
    '재생목록에 음악팩 추가 완료! (' + MusicPackData[packID - 1].name + ')'
  )
}

Functions.CacheMusicPack = async function (packData) {
  if (PackCache.get(packData.uid)) {
    return PackCache.get(packData.uid)
  }
  var cachedSongs = []
  for (var i in packData.musics) {
    const url = packData.musics[i]
    var songInfo = await getInfo('https://www.youtube.com/watch?v=' + url)
    const song = {
      title: songInfo.items[0].title,
      url: songInfo.items[0].webpage_url,
      id: songInfo.items[0].display_id,
      duration: songInfo.items[0].duration
    }
    cachedSongs.push(Functions.CacheMusicFile(song))
  }

  PackCache.set(packData.uid, cachedSongs)
  Functions.SaveCachedData()

  return cachedSongs
}

Functions.CacheMusicFile = function (song) {
  if (!fs.existsSync(songPath + song.id + '.webm')) {
    console.log('create music cache - ' + song.id)
    var vifstream = ytdl(song.url, { filter: 'audioonly' })
    var vofstream = fs.createWriteStream(songPath + song.id + '.webm')
    vifstream.pipe(vofstream)
  }

  return song
}

module.exports = Functions
