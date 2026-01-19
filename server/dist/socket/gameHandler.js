"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = gameHandler;
const GameEngine_1 = require("../games/GameEngine");
const sessions = {};
function gameHandler(io, socket) {
    socket.on('join_game', ({ letters, userId }) => {
        const session = new GameEngine_1.GameSession(socket.id, userId || 'anon', letters);
        sessions[socket.id] = session;
        socket.emit('game_ready', { duration: 180000 });
    });
    socket.on('start_game', () => {
        const session = sessions[socket.id];
        if (!session)
            return;
        socket.emit('start_countdown', { count: 3 });
        setTimeout(() => {
            // Start the engine's internal loop
            const emitSpawn = (event) => socket.emit('spawn_sprite', event);
            const onGameOver = (result) => endGame(socket, session, result);
            session.startGame(emitSpawn, onGameOver);
        }, 3000);
    });
    socket.on('submit_result', (data) => {
        const session = sessions[socket.id];
        if (!session)
            return;
        const emitSpawn = (event) => socket.emit('spawn_sprite', event);
        // processResult now handles history logging internally
        session.processResult(data, emitSpawn);
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
function endGame(socket, session, resultData) {
    // resultData comes from GameEngine.endGame()
    socket.emit('game_over', resultData);
    delete sessions[socket.id];
}
