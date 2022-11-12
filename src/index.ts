import http from 'node:http'
import { Server, Socket } from 'socket.io'

const httpServer = http.createServer().listen(8000)
const socketServer = new Server(httpServer, {
	cors: {
		origin: '*',
	},
})

const rooms = new Map<string, Set<string>>()

socketServer.on('connection', (socket: Socket & {
	data: Partial<{
		username: string
		room: string
	}>
}) => {
	console.log('Connected')

	socket.on('room-enter', (room: string, username: string) => {
		if(!rooms.has(room)) rooms.set(room, new Set())
		socket.join(room)

		if(rooms.get(room)!.has(username)) {
			console.log(username)
			return socket.emit('room-enter-failed')
		}

		rooms.get(room)!.add(username)

		socket.data.username = username
		socket.data.room = room

		socket.emit('room-enter-success', rooms.get(room))
		socket.to(room).emit('room-enter', username)

		console.log(username, room)
	})

	socket.on('message-send', (message: string) => {
		if(!socket.data.room || !socket.data.username) return socket.emit('not-logged')

		socketServer.to(socket.data.room).emit('message-recieve', socket.data.username, Date.now(), message)
	})

	socket.on("disconnect", (reason) => {
		if(!socket.data.room || !socket.data.username) return
		
		socket.to(socket.data.room).emit('room-exit', socket.data.username)
	})
})
