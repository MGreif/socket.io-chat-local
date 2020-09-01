const content = require('fs').readFileSync(__dirname + '/index.html', 'utf8')

const httpServer = require('http').createServer((req, res) => {
  res.setHeader('Content-Length', Buffer.byteLength(content))
  res.end(content)
})

const io = require('socket.io')(httpServer)

io.on('connect', socket => {
  socket.broadcast.emit('newUser')
  activeUsers++
  io.emit('update-actives', activeUsers)
})

let rooms = {}
let activeUsers = 0
const users = []

const removeEntryOfObjectProperties = (obj, entry) => {
  const props = Object.entries(obj).map(x => ([x[0], x[1].filter(l => l !== entry)])).reduce((acc, curr) => {
    acc[curr[0]] = curr[1]
    return acc
  }, {})
  return props
}

io.on('connection', socket => {
  socket.on('disconnect', data => {
    activeUsers--
    io.emit('update-actives', activeUsers)
  })

  socket.on('joinRoom', data => {
    const { cookie, room, currentRoom } = data
    if (!users.includes(cookie)) {
      users.push(cookie)
    }

    if (currentRoom) {
      socket.leave(currentRoom)
      socket.in(currentRoom).emit('user-leave', { ...data, room_left: currentRoom })
      rooms[currentRoom].splice(rooms[currentRoom].indexOf(cookie), 1)
    }

    socket.join(room)
    socket.in(room).emit('user-join', data)
    rooms = removeEntryOfObjectProperties(rooms, cookie)

    if (!rooms[room]) {
      rooms[room] = [cookie]
    } else {
      if (!rooms[room].includes(cookie)) {
        rooms[room].push(cookie)
      }
    }

    console.log('rooms', rooms)
    io.emit('update-rooms', rooms)
  })

  socket.on('send', data => {
    console.log(data)
    socket.in(data.currentRoom).emit('newItem', { value: data.value, username: data.username || data.cookie })
  })
})

httpServer.listen(3000, () => {
  console.log('listening on port 3000 ...')
})
