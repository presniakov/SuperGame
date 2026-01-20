import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthPayload {
    id: string;
}

// Extend Socket type to include user
declare module 'socket.io' {
    interface Socket {
        user?: AuthPayload;
    }
}

export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthPayload;
        socket.user = decoded;
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
    }
};
