import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { SpawnEvent, SpriteData, GameStyle } from '../types';

interface RenderSprite extends SpriteData {
    timestamp: number; // local start time
    size?: number;
}

const LETTER_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

export default function GameCanvas({ socket, onAbort, style = 'cyber', duration = 180000 }: { socket: Socket | null, onAbort: () => void, style?: GameStyle, duration?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const spritesRef = useRef<RenderSprite[]>([]);
    const requestRef = useRef<number>(0);

    // Timing & State Refs
    const sessionStartRef = useRef<number>(0);
    const lastEventEndRef = useRef<number>(0);
    const eventStartRef = useRef<number>(0);
    const eventIdRef = useRef<string>('');
    const resultsRef = useRef<{ spriteId: string, result: 'hit' | 'miss' | 'wrong', letter: string }[]>([]);
    const totalSpritesInEventRef = useRef<number>(0);


    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    const [timeLeft, setTimeLeft] = useState<number>(Math.floor(duration / 1000));

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



    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (!socket) return;

        // Listener Definitions
        const onCountdown = ({ count }: { count: number }) => {
            setCountdown(count);
            spritesRef.current = []; // Clear sprites
            let cur = count;
            const int = setInterval(() => {
                cur--;
                if (cur <= 0) {
                    clearInterval(int);
                    setCountdown(null);
                    // Session Starts
                    sessionStartRef.current = Date.now();
                    lastEventEndRef.current = Date.now(); // Initialize
                } else {
                    setCountdown(cur);
                }
            }, 1000);
        };

        const onSpawn = (event: SpawnEvent) => {
            const now = Date.now();
            const baseTime = lastEventEndRef.current || now;
            const targetStartTime = baseTime + (event.delay || 0);
            const waitTime = Math.max(0, targetStartTime - now);

            setTimeout(() => {
                eventStartRef.current = Date.now();
                eventIdRef.current = event.eventId;
                resultsRef.current = [];
                totalSpritesInEventRef.current = event.sprites.length;

                event.sprites.forEach(s => {
                    spritesRef.current.push({
                        ...s,
                        timestamp: Date.now(),
                        size: event.size
                    });
                });
            }, waitTime);
        };

        // Attach Listeners Always
        socket.on('start_countdown', onCountdown);
        socket.on('spawn_sprite', onSpawn);

        // Clean up
        const cleanup = () => {
            socket.off('start_countdown', onCountdown);
            socket.off('spawn_sprite', onSpawn);
        };

        // Emit start_game only once
        if (!hasStartedRef.current) {
            console.log('Emitting start_game');
            socket.emit('start_game');
            hasStartedRef.current = true;
        }

        return cleanup;
    }, [socket]);

    // Timer Interval
    useEffect(() => {
        if (countdown !== null) return;

        // Only start if we have time
        // We do NOT depend on timeLeft here to prevent re-creation interval loop
        // But we need to ensure we don't start it if it's already 0?
        // Actually, the interval logic handles check inside.

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const checkEventCompletion = () => {
        // Check if we have results for all sprites OR if a 'wrong' result terminated the event early?
        // Logic: specific sprites are removed on hit/miss.
        // If spritesRef is empty, event is done.

        if (spritesRef.current.length === 0) {
            const endTime = Date.now();
            const payload = {
                eventId: eventIdRef.current,
                results: resultsRef.current,
                startTime: eventStartRef.current - sessionStartRef.current,
                endTime: endTime - sessionStartRef.current
            };

            lastEventEndRef.current = endTime;
            socket?.emit('event_completed', payload);
        }
    };

    const handleResult = (result: 'hit' | 'miss' | 'wrong', letter: string, spriteId: string = '') => {
        resultsRef.current.push({ spriteId, result, letter });
        checkEventCompletion();
    };

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
                handleResult('hit', key, sprite.id);
            } else {
                // Wrong key press (not in ANY active sprite)
                // Clear local sprites to visually end event immediately
                spritesRef.current = [];
                handleResult('wrong', key);
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
                // Relaxed upper bound to -200 to allow for double events where second letter starts high.
                if (posX < -20 || posX > 120 || posY > 120 || posY < -200) {
                    // Note: posY < -50 allows for pre-spawn delay of second char in double pair if offset vertically
                    // But our logic spawns them at same time with spatial offset.

                    toRemove.push(index);
                    handleResult('miss', sprite.letter, sprite.id);
                }

                // Draw using dynamic dimensions
                const px = (posX / 100) * dimensions.width;
                const py = (posY / 100) * dimensions.height;

                // RENDERING LOGIC
                ctx.save();
                if (style === 'steam') {
                    // Steam Logic: Typewriter font, Bronze color, Heavy shadow
                    const fontSize = sprite.size || 50;
                    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
                    ctx.fillStyle = "#d97706"; // Bronze/Amber
                    ctx.shadowColor = "#000";
                    ctx.shadowBlur = 4;
                    ctx.fillText(sprite.letter, px, py + 30);
                } else if (style === 'cyber') {
                    const fontSize = sprite.size || 60;
                    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
                    ctx.fillStyle = "#fff";
                    ctx.shadowColor = LETTER_COLORS[sprite.letter.charCodeAt(0) % LETTER_COLORS.length];
                    ctx.shadowBlur = 20;
                    ctx.fillText(sprite.letter, px, py + 30);
                } else if (style === 'hi-tech') {
                    // Hi-Tech / Clean Text
                    const fontSize = sprite.size || 40;
                    ctx.font = `500 ${fontSize}px 'Rajdhani', sans-serif`;
                    ctx.fillStyle = "#0f172a";
                    ctx.fillText(sprite.letter, px, py + 30);
                }
                ctx.restore();
            });

            for (let i = toRemove.length - 1; i >= 0; i--) {
                spritesRef.current.splice(toRemove[i], 1);
            }

            if (toRemove.length > 0) {
                checkEventCompletion();
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
            // Cyber uses dark bg, Hi-Tech uses transparent (showing global body bg)
            // Steam uses semi-transparent dark to let rivets show through but keep contrast
            background: style === 'cyber' ? '#111' : (style === 'steam' ? 'rgba(0,0,0,0.3)' : 'transparent'),
            overflow: 'hidden',
            cursor: 'none', // Hide cursor during game
            userSelect: 'none' // Prevent text selection
        }}>
            {/* Timer Display */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '30px',
                fontFamily: style === 'steam' ? "'Courier New', monospace" : (style === 'hi-tech' ? "'Consolas', 'Monaco', monospace" : "'Robot Mono', 'Consolas', monospace"),
                fontSize: '2rem',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums', // Fixed width for digits
                color: style === 'cyber' ? '#00f3ff' : (style === 'steam' ? '#d97706' : '#0f172a'),
                textShadow: style === 'cyber' ? '0 0 10px #00f3ff' : 'none',
                letterSpacing: '2px',
                zIndex: 10
            }}>
                {formatTime(timeLeft)}
            </div>

            {countdown !== null && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    fontSize: '100px', fontWeight: 'bold',
                    color: style === 'cyber' ? '#fff' : (style === 'steam' ? '#d97706' : '#0f172a'),
                    textShadow: style === 'cyber' ? '0 0 20px red' : 'none'
                }}>
                    {countdown}
                </div>
            )}
            <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} />
        </div>
    );
}
