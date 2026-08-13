import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected users by their app userId
const connectedUsers = new Map<string, Set<string>>() // userId -> Set<socketId>

interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: string
  link?: string
}

io.on('connection', (socket) => {
  let currentUserId: string | null = null

  socket.on('register', (data: { userId: string }) => {
    currentUserId = data.userId
    if (!connectedUsers.has(currentUserId)) {
      connectedUsers.set(currentUserId, new Set())
    }
    connectedUsers.get(currentUserId)!.add(socket.id)
    console.log(`User ${currentUserId} registered (socket: ${socket.id}, total connections: ${connectedUsers.get(currentUserId)!.size})`)
  })

  socket.on('unregister', () => {
    if (currentUserId && connectedUsers.has(currentUserId)) {
      connectedUsers.get(currentUserId)!.delete(socket.id)
      if (connectedUsers.get(currentUserId)!.size === 0) {
        connectedUsers.delete(currentUserId)
      }
    }
  })

  socket.on('notification', (payload: NotificationPayload) => {
    // Allow server-side or cross-user notification broadcasting
    const targetUserId = payload.userId
    const sockets = connectedUsers.get(targetUserId)
    if (sockets) {
      const notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: payload.link || null,
        createdAt: new Date().toISOString(),
        read: false,
      }
      for (const sId of sockets) {
        io.to(sId).emit('new-notification', notification)
      }
      console.log(`Notification sent to user ${targetUserId}: ${payload.title}`)
    }
  })

  socket.on('ping-custom', () => {
    socket.emit('pong-custom', { timestamp: new Date().toISOString() })
  })

  socket.on('disconnect', () => {
    if (currentUserId && connectedUsers.has(currentUserId)) {
      connectedUsers.get(currentUserId)!.delete(socket.id)
      if (connectedUsers.get(currentUserId)!.size === 0) {
        connectedUsers.delete(currentUserId)
      }
      console.log(`User ${currentUserId} disconnected (${socket.id})`)
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`Notification WebSocket service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Notification service shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Notification service shutting down...')
  httpServer.close(() => process.exit(0))
})
