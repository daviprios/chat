import http from 'node:http'
import { Server, Socket } from 'socket.io'
import chalk from 'chalk'

const httpServer = http.createServer().listen(8000, () => {
	console.log('Server Started')
})
const socketServer = new Server(httpServer, {
	cors: {
		origin: '*',
    methods: ['GET', 'POST']
	},
})

const rooms = new Map<string, Set<string>>()

socketServer.on('connection', (socket: Socket & {
	data: Partial<{
		username: string
		room: string
	}>
}) => {
	console.log(chalk`{magenta ${socket.id}} has connected`)
	socket.on('room-enter', (room: string, username: string) => {
		console.log(chalk`{magenta ${socket.id}} as {blue ${username}} is trying to enter room {green ${room}}`)

		if(!rooms.has(room)) rooms.set(room, new Set())
		socket.join(room)

		if(rooms.get(room)!.has(username)) {
			console.log(chalk`{blue ${username}} is already online in room {green ${room}}. Cannot have duplicants`)
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

		console.log(chalk`{blue ${username}} has successfully entered room {green ${room}}`)
	})

	socket.on('message-send', (message: string) => {
		if(!socket.data.room || !socket.data.username) return socket.emit('not-logged')
		
		console.log(chalk`{green ${socket.data.room}} {blue ${socket.data.username}}: {yellow ${message}} at {bgCyan ${new Date().toISOString()}}`)
		
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

		console.log(chalk`{blue ${socket.data.username}} has exited room {green ${socket.data.room}}`)

		rooms.get(socket.data.room)!.delete(socket.data.username)
		socket.to(socket.data.room).emit('room-exit', socket.data.username)
	})
	
	socket.on('disconnecting', () => {
		if(!socket.data.room || !socket.data.username) {
			console.log(chalk`{magenta ${socket.id}} has not data, therefore not logged for disconnecting`)
			return socket.emit('not-logged')
		}
		
		console.log(chalk`{blue ${socket.data.username}} has disconnected from the server, therefore exiting room {green ${socket.data.room}}`)

		rooms.get(socket.data.room)!.delete(socket.data.username)
		socket.to(socket.data.room).emit('room-exit', socket.data.username)
	})
})
