import http from 'node:http'
import { Server } from 'socket.io'

const httpServer = http.createServer()
const socketServer = new Server(httpServer)

socketServer.on('connection', (socket) => {
  console.log('connection')
})