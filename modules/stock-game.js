const UserManager = require('./user-manager')
const schedule = require('node-schedule')

var Functions = {}

var StockData = {}

Functions.LoadServerData = function() {
    if (fs.existsSync('./data/stockgame.json')) {
        StockData = JSON.parse(fs.readFileSync('./data/stockgame.json'))
    } else {
        StockData = {
        }
        fs.writeFileSync('./data/stockgame.json', JSON.stringify(StockData))
    }
}

Functions.SvaeServerData = function() {

}

Functions.NumberFormat = function(number){
    if(number==0) return 0;
 
    var reg = /(^[+-]?\d+)(\d{3})/;
    var n = (number + '');
 
    while (reg.test(n)) n = n.replace(reg, '$1' + ',' + '$2');
 
    return n;
};

Functions.TestData = function (message) {
  var id = message.member.user.id
  UserManager.TestData(id)
  var data = UserManager.GetData(id)
  if (data.stock === undefined) {
    data.stock = {
      gold: 10000000,
      stocklist: [],
      high: 10000000,
      low: 10000000
    }
    UserManager.SetData(id, data)
    UserManager.Save(id)
  }
  return data
}

Functions.StockInfo = function (message) {
  var id = message.member.user.id
  var data = Functions.TestData(message)

  var resultMSG = message.member.user.tag + '의 주식 미니게임 정보\n```'
  resultMSG += '보유 골드 : ' + Functions.NumberFormat(data.stock.gold) + 'G```\n'
  resultMSG += '보유 주식 목록\n```'
  if (data.stock.stocklist.length <= 0) resultMSG += '보유한 주식 목록이 없습니다.\n'
  for(var i in data.stocklist) {
      resultMSG += '[' + i + '] ' + data.stock.stocklist[i] + '\n'
  }
  resultMSG += '```'

  UserManager.SetData(id, data)
  UserManager.Save(id)
  return message.channel.send(resultMSG).then(msg => {
    msg.delete({ timeout: 15000 })
  })
}

module.exports = Functions
