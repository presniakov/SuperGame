import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { SpawnEvent, SpriteData, GameStyle } from '../types';

interface RenderSprite extends SpriteData {
    timestamp: number; // local start time
}

const LETTER_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

export default function GameCanvas({ socket, onAbort, style = 'cyber' }: { socket: Socket | null, onAbort: () => void, style?: GameStyle }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const spritesRef = useRef<RenderSprite[]>([]);
    const requestRef = useRef<number>(0);


    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const handleResize = () => {
            // "Maximum available window area, but not more than 1920x1080"
            const maxWidth = 1920;
            const maxHeight = 1080;

            // We subtract a little to ensure borders don't cause scrollbars if possible, 
            // or we can set body { overflow: hidden } in CSS (but that's global).
            // Let's just fit to window.
            const w = Math.min(window.innerWidth, maxWidth);
            const h = Math.min(window.innerHeight, maxHeight);

            setDimensions({ width: w, height: h });
        };

        // Initial calc
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);



    useEffect(() => {
        if (!socket) return;

        socket.on('start_countdown', ({ count }) => {
            setCountdown(count);
            spritesRef.current = []; // Clear sprites
            let cur = count;
            const int = setInterval(() => {
                cur--;
                if (cur <= 0) {
                    clearInterval(int);
                    setCountdown(null);
                } else {
                    setCountdown(cur);
                }
            }, 1000);
        });

        socket.on('spawn_sprite', (event: SpawnEvent) => {
            // Event contains 'sprites' array
            const now = Date.now();
            event.sprites.forEach(s => {
                spritesRef.current.push({ ...s, timestamp: now });
            });
        });

        socket.emit('start_game');

        return () => {
            socket.off('start_countdown');
            socket.off('spawn_sprite');
        };
    }, [socket]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                socket?.emit('abort_game');
                onAbort();
                return;
            }

            if (countdown !== null) return; // Ignore during countdown

            const key = e.key.toUpperCase();

            // Find matching sprite
            const hitIndex = spritesRef.current.findIndex(s => s.letter === key);

            if (hitIndex >= 0) {
                // If we found a letter match, we MUST check if it's the expected one?
                // Server enforces order. Client just optimizes.
                // But if user hits "B" (second) instead of "A" (first), server fails event.
                // Client should probably just send it and let server decide? 
                // But wait, if server ends event, client needs to know to clear sprites.
                // Maybe server sends "game_update" or we just clear on "wrong"?
                // The prompt says "event is ended with failure". 
                // Let's optimistic clear on any "wrong" detection (no match).
                // What if match found but wrong order? 
                // We don't know strict order client-side easily without duplicating logic.
                // Let's just send 'hit' if valid chars. 
                // IF server decides it's WRONG order, it fails. 
                // WE need to respond to that? 
                // We need a 'clear_sprites' event from server OR we just clear on next spawn?
                // Clearing on next spawn (in my previous code, I do NOT clear on spawn, I append).
                // I should probably clear on 'wrong' detection locally.

                // Let's trust strict server. 
                // If I hit valid letter, I hide it locally.
                const sprite = spritesRef.current[hitIndex];
                spritesRef.current.splice(hitIndex, 1);
                socket?.emit('submit_result', { result: 'hit', letter: key, spriteId: sprite.id });
            } else {
                // Wrong key press (not in ANY active sprite)
                // "event is ended with failure"
                // Clear local sprites to visually end event immediately
                spritesRef.current = [];
                socket?.emit('submit_result', { result: 'wrong', letter: key });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [socket, countdown, onAbort]);

    // Game Loop
    useEffect(() => {
        const animate = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear with dynamic dimensions
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);

            const now = Date.now();
            const toRemove: number[] = [];

            spritesRef.current.forEach((sprite, index) => {
                const dt = (now - sprite.timestamp) / 1000;

                const posX = sprite.startX + sprite.velocityX * dt;
                const posY = sprite.startY + sprite.velocityY * dt;

                // Bounds Check: Vertical or Horizontal
                // Vertical bounds: starts at -100 (or above 0) and goes down. Bound when > 100 + margin.
                // Horizontal bounds: -20 to 120.
                if (posX < -20 || posX > 120 || posY > 120 || posY < -50) {
                    // Note: posY < -50 allows for pre-spawn delay of second char in double pair if offset vertically
                    // But our logic spawns them at same time with spatial offset.

                    toRemove.push(index);
                    socket?.emit('submit_result', { result: 'miss', letter: sprite.letter, spriteId: sprite.id });
                }

                // Draw using dynamic dimensions
                const px = (posX / 100) * dimensions.width;
                const py = (posY / 100) * dimensions.height;

                // RENDERING LOGIC
                ctx.save();
                if (style === 'steam') {
                    // Steam Logic: Typewriter font, Bronze color, Heavy shadow
                    ctx.font = "bold 50px 'Courier New', monospace";
                    ctx.fillStyle = "#d97706"; // Bronze/Amber
                    ctx.shadowColor = "#000";
                    ctx.shadowBlur = 4;
                    ctx.fillText(sprite.letter, px, py + 30);
                } else if (style === 'cyber') {
                    ctx.font = "bold 60px 'Segoe UI', sans-serif";
                    ctx.fillStyle = "#fff";
                    ctx.shadowColor = LETTER_COLORS[sprite.letter.charCodeAt(0) % LETTER_COLORS.length];
                    ctx.shadowBlur = 20;
                    ctx.fillText(sprite.letter, px, py + 30);
                } else {
                    // Lab / Simple Text
                    ctx.font = "bold 40px Arial";
                    ctx.fillStyle = "#333";
                    ctx.fillText(sprite.letter, px, py + 30);
                }
                ctx.restore();
            });

            for (let i = toRemove.length - 1; i >= 0; i--) {
                spritesRef.current.splice(toRemove[i], 1);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [socket, dimensions, style]); // Add dimensions dependency to redraw if resized

    // const { theme } = useTheme(); // Removed

    return (
        <div style={{
            position: 'relative',
            width: dimensions.width,
            height: dimensions.height,
            margin: '0 auto',
            // Cyber uses dark bg, Lab uses transparent (showing global body bg)
            // Steam uses semi-transparent dark to let rivets show through but keep contrast
            background: style === 'cyber' ? '#111' : (style === 'steam' ? 'rgba(0,0,0,0.3)' : 'transparent'),
            overflow: 'hidden'
        }}>
            {countdown !== null && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    fontSize: '100px', fontWeight: 'bold',
                    color: style === 'cyber' ? '#fff' : 'var(--neon-pink)',
                    textShadow: style === 'cyber' ? '0 0 20px red' : 'none'
                }}>
                    {countdown}
                </div>
            )}
            <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} />
        </div>
    );
}
