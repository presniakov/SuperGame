
import { useEffect, useRef, useState, useCallback } from 'react';
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

                // SpriteData comes from event, we add timestamp for RenderSprite
                event.sprites.forEach((s: SpriteData) => {
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

    const checkEventCompletion = useCallback(() => {
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
    }, [socket]);

    const handleResult = useCallback((result: 'hit' | 'miss' | 'wrong', letter: string, spriteId: string = '') => {
        resultsRef.current.push({ spriteId, result, letter });
        checkEventCompletion();
    }, [checkEventCompletion]); // No deps needed as refs are stable

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                socket?.emit('abort_game');
                onAbort();
                return;
            }

            if (countdown !== null) return; // Ignore during countdown
            if (spritesRef.current.length === 0) return; // No active sprites

            const key = e.key.toUpperCase();

            // STRICT SEQUENTIAL CHECK
            // Always check against the FIRST falling sprite (index 0)
            // (Since sprites are pushed in generation order, 0 is the "leader")
            const targetSprite = spritesRef.current[0];

            if (targetSprite.letter === key) {
                // Correct Hit on First Sprite
                spritesRef.current.splice(0, 1); // Remove it
                handleResult('hit', key, targetSprite.id);
            } else {
                // Wrong Key OR Trying to hit valid 2nd letter out of order
                // "End event with result wrong"
                spritesRef.current = []; // Clear all to stop visual processing
                handleResult('wrong', key, targetSprite.id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [socket, countdown, onAbort, handleResult]);

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
            let eventFailed = false;
            let failedSpriteId = '';

            // 1. UPDATE & CHECK BOUNDS
            // If ANY sprite goes out of bounds, the whole event fails immediately.
            for (let i = 0; i < spritesRef.current.length; i++) {
                const sprite = spritesRef.current[i];
                const dt = (now - sprite.timestamp) / 1000;

                // Calculate current position for check
                const posX = sprite.startX + sprite.velocityX * dt;
                const posY = sprite.startY + sprite.velocityY * dt;

                // Bounds Check
                // Vertical bounds: starts negative, falls positive. Miss if > 120.
                if (posX < -20 || posX > 120 || posY > 120 || posY < -200) {
                    eventFailed = true;
                    failedSpriteId = sprite.id;
                    break;
                }
            }

            if (eventFailed) {
                spritesRef.current = []; // Clear all visuals immediately
                handleResult('miss', 'ANY', failedSpriteId); // Result 'miss' ends event
                // Stop this frame
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            // 2. DRAW (Only if not failed)
            spritesRef.current.forEach((sprite) => {
                const dt = (now - sprite.timestamp) / 1000;
                const posX = sprite.startX + sprite.velocityX * dt;
                const posY = sprite.startY + sprite.velocityY * dt;

                const px = (posX / 100) * dimensions.width;
                const py = (posY / 100) * dimensions.height;

                // RENDERING LOGIC
                ctx.save();

                // Handle Flipped Sprite
                if (sprite.isFlipped) {
                    // Move origin to sprite center
                    // We draw text at (px, py + 30). Center depends on size. 
                    // Let's approximate center or just flip at the anchor point.
                    // Text anchor is default (left-bottom roughly?). 
                    // ctx.fillText(str, x, y). 
                    // To flip in place: translate to (x, y), scale(1, -1), draw at (0, 0).
                    // But we draw at py + 30.
                    // Let's translate to (px, py).

                    const centerX = px + (sprite.size || 50) / 3; // Approx center X
                    const centerY = py + 15; // Approx center Y

                    ctx.translate(centerX, centerY);
                    ctx.scale(1, -1);
                    ctx.translate(-centerX, -centerY);
                }

                if (style === 'steam') {
                    const fontSize = sprite.size || 50;
                    ctx.font = `bold ${fontSize}px 'Rajdhani', sans-serif`;
                    ctx.fillStyle = "#d97706";
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
                    const fontSize = sprite.size || 40;
                    ctx.font = `500 ${fontSize}px 'Rajdhani', sans-serif`;
                    ctx.fillStyle = "#0f172a";
                    ctx.fillText(sprite.letter, px, py + 30);
                }
                ctx.restore();
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [socket, dimensions, style, handleResult]); // Add dimensions dependency to redraw if resized

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
                fontFamily: style === 'steam' ? "'Rajdhani', sans-serif" : (style === 'hi-tech' ? "'Consolas', 'Monaco', monospace" : "'Robot Mono', 'Consolas', monospace"),
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
                    fontFamily: style === 'steam' ? "'Rajdhani', sans-serif" : 'inherit',
                    textShadow: style === 'cyber' ? '0 0 20px red' : 'none'
                }}>
                    {countdown}
                </div>
            )}
            <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} />
        </div>
    );
}
