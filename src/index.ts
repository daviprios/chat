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
			return socket.emit('room-enter-fail')
		}

		rooms.get(room)!.add(username)

		socket.data.username = username
		socket.data.room = room

		socket.emit('room-enter-success', username)

		let users: string[] = []
		rooms.get(room)?.forEach((username) => {
			users.push(username)
		})
		socketServer.in(room).emit('room-enter', users)

		console.log(username, room)
	})

	socket.on('message-send', (message: string) => {
		if(!socket.data.room || !socket.data.username) return socket.emit('not-logged')
		
		console.log(message, socket.data.username, Date.now())
		
		socketServer.to(socket.data.room).emit('message-recieve', message, socket.data.username, Date.now())
	})
	
	socket.on('room-list', () => {
		if(!socket.data.room || !socket.data.username) return socket.emit('not-logged')

		let users: string[] = []
		rooms.get(socket.data.room)?.forEach((username) => {
			users.push(username)
		})
		socket.emit('room-list', users)
	})

	socket.on('room-exit', () => {
		if(!socket.data.room || !socket.data.username) return socket.emit('not-logged')

		console.log('exit', socket.data.username)

		rooms.get(socket.data.room)!.delete(socket.data.username)
		socket.to(socket.data.room).emit('room-exit', socket.data.username)
	})
	
	socket.on("disconnect", () => {
		if(!socket.data.room || !socket.data.username) return socket.emit('not-logged')
		
		console.log('exit', socket.data.username)

		rooms.get(socket.data.room)!.delete(socket.data.username)
		socket.to(socket.data.room).emit('room-exit', socket.data.username)
	})
})
