'use client'

import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface RealtimeNotification {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  createdAt: string
  read: boolean
}

type NotificationHandler = (notification: RealtimeNotification) => void

let socketInstance: Socket | null = null
let connectedUserId: string | null = null
const handlers = new Set<NotificationHandler>()

function getSocket(userId: string): Socket {
  if (socketInstance && connectedUserId === userId) {
    return socketInstance
  }

  // Disconnect previous
  if (socketInstance) {
    socketInstance.disconnect()
  }

  connectedUserId = userId
  socketInstance = io('/?XTransformPort=3004', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  })

  socketInstance.on('connect', () => {
    console.log('Notification service connected')
    socketInstance!.emit('register', { userId })
  })

  socketInstance.on('new-notification', (notification: RealtimeNotification) => {
    handlers.forEach((handler) => handler(notification))
  })

  socketInstance.on('disconnect', () => {
    console.log('Notification service disconnected')
  })

  return socketInstance
}

/**
 * Hook to subscribe to real-time notifications via callback.
 */
export function useRealtimeNotifications(
  userId: string | null,
  onNotification: (notification: RealtimeNotification) => void
) {
  useEffect(() => {
    if (!userId) return

    const socket = getSocket(userId)

    const handler: NotificationHandler = onNotification
    handlers.add(handler)

    return () => {
      handlers.delete(handler)
    }
  }, [userId, onNotification])
}

/**
 * Send a notification to a specific user (called from client).
 */
export function sendNotification(userId: string, title: string, message: string, type: string, link?: string) {
  const socket = getSocket(userId)
  socket.emit('notification', { userId, title, message, type, link })
}
