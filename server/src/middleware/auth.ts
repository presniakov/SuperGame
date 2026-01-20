import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthPayload {
    id: string;
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
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

export const auth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthPayload;
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
