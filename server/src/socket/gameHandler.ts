import { Server, Socket } from 'socket.io';
import { GameSession } from '../games/GameEngine';
import GameResult from '../models/GameResult';
import { ProfileType } from '../games/GameProfiles';
import { SessionType } from '../games/SessionStrategies';
import User from '../models/User';

const sessions: Record<string, GameSession> = {};

export default function gameHandler(io: Server, socket: Socket) {
    socket.on('join_game', async ({ letters, userId }) => {
        let profileType: string = ProfileType.CASUAL;
        let sessionType: SessionType = SessionType.GRIND;

        // Fetch user preferences if userId is valid
        if (userId && userId !== 'anon') {
            try {
                const user = await User.findById(userId);
                if (user) {
                    if (user.preferences?.profile) {
                        profileType = user.preferences.profile;
                    }

                    // Helper for forced type
                    const forced = user.preferences?.forceSessionType as SessionType;
                    if (forced && Object.values(SessionType).includes(forced)) {
                        sessionType = forced;
                        console.log(`[GameHandler] User ${user.username} forcing session: ${sessionType}`);
                    } else if (profileType === ProfileType.UNDEFINED) {
                        // Force Calibration for Undefined Profile
                        sessionType = SessionType.CALIBRATION;
                        console.log(`[GameHandler] User ${user.username} is UNDEFINED -> Forcing CALIBRATION`);
                    } else {
                        // Modulo Logic
                        const total = user.totalSessionsPlayed || 0;
                        if (total === 0) {
                            sessionType = SessionType.CALIBRATION;
                        } else {
                            // Cycle: 1->Grind, 2->Grind, 3->Breakthrough, 0->Recovery
                            const mod = total % 4;
                            if (mod === 1 || mod === 2) sessionType = SessionType.GRIND;
                            else if (mod === 3) sessionType = SessionType.BREAKTHROUGH;
                            else sessionType = SessionType.RECOVERY; // mod 0
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching user config for game:', err);
            }
        } else {
            // Anon logic: Always Grind or Calibration? 
            // Default is Grind for now.
        }

        const session = new GameSession(socket.id, userId || 'anon', letters, profileType, sessionType);
        sessions[socket.id] = session;
        socket.emit('game_ready', { duration: session.getDuration() });
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

        const onGameOver = (result: any) => endGame(socket, session, result);
        session.processEventBatch(data, emitSpawn, onGameOver);
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
