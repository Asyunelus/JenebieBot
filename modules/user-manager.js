const fs = require('fs')
const utf8 = require('utf8')

const DataMap = new Map()

var Functions = {}

Functions.LoadAll = function() {
    for(var i = 0; i < 10; ++i) {
        fs.mkdirSync('./data/user/' + i.toString() + '/', { recursive: true });
        fs.readdirSync('./data/user/' + i.toString() + '/').forEach(file => {
            if (file.endsWith('.json')) {
                var userid = file.substring(0, file.length - 5)
                DataMap.set(userid, Functions.LoadData(userid))
            }
        })
    }
}

Functions.LoadData = function(userid) {
    const data = fs.readFileSync('./data/user/' + userid.substring(0, 1) + '/' + userid + '.json')
    return JSON.parse(data)
}

Functions.SaveAll = function() {
    DataMap.forEach((value, key, map) => {
        SaveData(key, value)
    })
}

Functions.SaveData = function(userid, data) {
    fs.writeFileSync('./data/user/' + userid.substring(0, 1) + '/' + userid + '.json', JSON.stringify(data))
}

Functions.Save = function(userid) {
    Functions.SaveData(userid, DataMap.get(userid))
}

Functions.GetData = function(userid) {
    return DataMap.get(userid)
}

Functions.SetData = function(userid, data) {
    DataMap.set(userid, data)
}

Functions.TestData = function(userid) {
    if (!DataMap.get(userid)) {
        DataMap.set(userid, {
            id: userid
        })
        Functions.Save(userid)
    }
}

module.exports = Functions