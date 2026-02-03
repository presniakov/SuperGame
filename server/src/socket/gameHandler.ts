import { Server, Socket } from 'socket.io';
import { GameSession } from '../games/GameEngine';
import GameResult from '../models/GameResult';
import { ProfileType } from '../games/GameProfiles';
import User from '../models/User';

const sessions: Record<string, GameSession> = {};

export default function gameHandler(io: Server, socket: Socket) {
    socket.on('join_game', async ({ letters, userId }) => {
        let profileType: string = ProfileType.CASUAL;

        // Fetch user preferences if userId is valid
        if (userId && userId !== 'anon') {
            try {
                const user = await User.findById(userId);
                if (user && user.preferences?.profile) {
                    profileType = user.preferences.profile;
                }
            } catch (err) {
                console.error('Error fetching user config for game:', err);
            }
        }

        const session = new GameSession(socket.id, userId || 'anon', letters, profileType);
        sessions[socket.id] = session;
        socket.emit('game_ready', { duration: 180000 });
    });

    socket.on('start_game', () => {
        const session = sessions[socket.id];
        if (!session) return;

        socket.emit('start_countdown', { count: 3 });

        setTimeout(() => {
            // Start the engine's internal loop
            const emitSpawn = (event: any) => socket.emit('spawn_sprite', event);
            const onGameOver = (result: any) => endGame(socket, session, result);

            session.startGame(emitSpawn, onGameOver);
        }, 3000);
    });

    socket.on('event_completed', (data) => {
        const session = sessions[socket.id];
        if (!session) return;

        const emitSpawn = (event: any) => socket.emit('spawn_sprite', event);

        session.processEventBatch(data, emitSpawn);
    });

    socket.on('abort_game', () => {
        const session = sessions[socket.id];
        if (session) {
            session.abortGame();
            delete sessions[socket.id];
        }
    });

    socket.on('disconnect', () => {
        delete sessions[socket.id];
    });
}

function endGame(socket: Socket, session: GameSession, resultData: any) {
    // resultData comes from GameEngine.endGame()
    socket.emit('game_over', resultData);
    delete sessions[socket.id];
}
