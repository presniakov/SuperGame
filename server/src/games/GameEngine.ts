import { v4 as uuidv4 } from 'uuid';
import GameResult from '../models/GameResult';

// Constants roughly estimating letter size in our 0-100 coordinate system
const LETTER_SIZE = 5; // assumes ~5% screen size
const DOUBLE_OFFSET_X = (2 / 3) * LETTER_SIZE;
const DOUBLE_DISTANCE_Y = 1.5 * LETTER_SIZE;
const MIN_SPEED = 10;
const MAX_SPEED = 90;

interface SpriteState {
    id: string;
    letter: string;
    active: boolean;
}

export class GameSession {
    private socketId: string;
    private userId: string;
    private targetLetters: string[];
    private score: number = 0;
    private history: any[] = [];
    private startTime: number;
    private duration: number = 3 * 60 * 1000; // 3 mins
    private isActive: boolean = false;

    // Difficulty params
    private currentSpeed: number = 80; // units per second

    // Event State
    private activeSprites: SpriteState[] = [];
    private currentEventId: string | null = null;
    private eventTimeout: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(socketId: string, userId: string, letters: string[]) {
        this.socketId = socketId;
        this.userId = userId;
        this.targetLetters = letters;
        this.startTime = Date.now();
        this.isActive = true;
    }

    public getUserId(): string {
        return this.userId;
    }

    public startGame(emitSpawn: (event: any) => void, onGameOver: (result: any) => void) {
        if (this.isRunning) {
            console.warn(`[SERVER] Ignored duplicate startGame call for user ${this.userId}`);
            return;
        }
        this.isRunning = true;

        // Start countdown or just start loop? 
        // Logic assumes countdown handled by handler. 
        // We trigger first spawn.
        this.triggerNextSpawn(emitSpawn, true); // Pass true for isFirst

        // End game timer
        setTimeout(() => {
            this.endGame(onGameOver);
        }, this.duration);
    }

    // Simplified: Just trigger immediate generation. Client handles delays.
    private triggerNextSpawn(emitSpawn: (event: any) => void, isFirst: boolean = false) {
        if (!this.isActive) return;
        const event = this.generateSpawn(isFirst);

        // Track active sprites (snapshot for validation if needed, though batch validation differs)
        this.activeSprites = event.sprites.map(s => ({ id: s.id, letter: s.letter, active: true }));
        this.currentEventId = event.eventId;

        emitSpawn(event);
    }

    private generateSpawn(isFirst: boolean = false) {
        // Determine type: Single/Double (start with 50/50 or adaptive?)
        const isDouble = Math.random() > 0.5;

        const type = isDouble ? 'double' : 'single';
        const eventId = uuidv4();
        const sprites = [];

        // Pick letters
        // For single: pick 1 random from targetLetters
        // For double: pick 2 (can be same or different)

        const l1 = this.targetLetters[Math.floor(Math.random() * this.targetLetters.length)];

        // Base X (keep within bounds)
        // Fixed size 350px.
        // Assume reference resolution 1920x1080 for coordinate conversion 0-100 logic.
        // 350px width is approx 18.2% of 1920.
        // 350px height is approx 32.4% of 1080.
        const REF_WIDTH = 1920;
        const REF_HEIGHT = 1080;
        const SIZE_PX = 350;

        const SIZE_X = (SIZE_PX / REF_WIDTH) * 100; // ~18.2
        const SIZE_Y = (SIZE_PX / REF_HEIGHT) * 100; // ~32.4

        const GAP_RATIO = 1 / 3;
        const GAP_X = SIZE_X * GAP_RATIO; // ~6
        const DIST_Y = SIZE_Y - (SIZE_Y * GAP_RATIO); // ~43 (Size + Gap) for "following"

        // Total width of double event = SIZE_X + GAP_X + SIZE_X = ~42.4 units
        const DOUBLE_WIDTH = (2 * SIZE_X) + GAP_X;

        // Margin 2%
        // Max StartX = 100 - Margin - width (if double) or width (if single)
        // If single, width is SIZE_X.

        const margin = 2;
        let maxStart = 100 - margin - SIZE_X;
        if (type === 'double') {
            maxStart = 100 - margin - DOUBLE_WIDTH;
        }

        // Ensure maxStart > margin
        maxStart = Math.max(margin, maxStart);

        const startX = margin + Math.random() * (maxStart - margin);

        if (type === 'single') {
            // Simplify Single to always random direction or Top-Down?
            // "one letter for 'single' event" - logic exists. 
            // Previous code had "isVertical" random. Keep it or force top-down?
            // "the 'two-letters' event is always top-down" implies single might not be.
            // Keeping single as is, but updating startX/bounds logic if needed.
            // Actually, keep single "random direction" logic but ensure bounds.

            const isVertical = Math.random() > 0.5;

            let vx = 0, vy = 0;
            let sx = startX, sy = -20; // Start higher due to large size

            if (isVertical) {
                vy = this.currentSpeed;
                sy = -SIZE_Y; // Start fully off-screen
            } else {
                vx = (Math.random() > 0.5 ? 1 : -1) * this.currentSpeed;
                sy = 10 + Math.random() * 60; // Random height for horizontal flyer
                sx = vx > 0 ? -SIZE_X : 100;
            }

            sprites.push({
                id: uuidv4(),
                letter: l1,
                startX: sx,
                startY: sy,
                velocityX: vx,
                velocityY: vy
            });

        } else {
            // Double: Top-Down Only
            let l2 = l1;
            if (this.targetLetters.length > 1) {
                //do {
                l2 = this.targetLetters[Math.floor(Math.random() * this.targetLetters.length)];
                //} while (l2 === l1);
            }

            // Letter 1 (Leader - Lower / First)
            sprites.push({
                id: uuidv4(),
                letter: l1,
                startX: startX,
                startY: -SIZE_Y, // Start just off screen
                velocityX: 0,
                velocityY: this.currentSpeed
            });

            // Letter 2 (Follower - Higher / Second)
            // "horizontal gap of 1/3" -> Offset X by SIZE + GAP
            // "vertical direction... follow... distance 1/3" -> Offset Y by -(SIZE + GAP)

            sprites.push({
                id: uuidv4(),
                letter: l2,
                startX: startX + SIZE_X + GAP_X,
                startY: -SIZE_Y - DIST_Y,
                velocityX: 0,
                velocityY: this.currentSpeed
            });
        }

        // Random delay 300ms - 1000ms. If first, 0.
        const delay = isFirst ? 0 : (300 + Math.floor(Math.random() * 700));

        return {
            eventId,
            type,
            sprites,
            size: 350,
            delay
        };
    }

    public processEventBatch(
        data: {
            eventId: string,
            results: { spriteId: string, result: 'hit' | 'miss' | 'wrong', letter: string }[],
            startTime: number,
            endTime: number
        },
        emitSpawn: (event: any) => void
    ) {
        if (!this.isActive) return;

        // Idempotency Check: 
        // If the processed event is NOT the current active event, ignore it.
        // This prevents double executions if client emits duplicate packets.
        if (data.eventId !== this.currentEventId) {
            console.warn(`[SERVER] Ignored stale/duplicate event completion. Current: ${this.currentEventId}, Received: ${data.eventId}`);
            return;
        }

        // Clear current event to prevent re-processing
        this.currentEventId = null;

        // Process the batch
        // We assume strict sequentiality: correct keys in correct order if Double.
        // Or we just trust the client's result report? 
        // For security, verifying against this.activeSprites is good, but user wants flow fix first.
        // Let's iterate and score.

        // Strict Sequention Order Check
        // The results must correspond to the sprites in the order they were generated (activeSprites are ordered).
        // If results[0] processes sprite[1], it's a failure.
        // We expect index 0, then 1...

        let expectedIndex = 0;
        let batchFailed = false;

        for (const item of data.results) {
            const { result, letter, spriteId } = item;
            const timeOffset = data.endTime;

            // Find which sprite this result is for
            // Note: 'wrong' result has no spriteId usually, or we match by letter? 
            // If 'wrong', it's a failure immediately.
            if (result === 'wrong') {
                this.score = Math.max(0, this.score - 5);
                this.currentSpeed = Math.max(MIN_SPEED, this.currentSpeed - 0.5);
                this.history.push({ result: 'wrong', letter, speed: this.currentSpeed, timeOffset });
                batchFailed = true;
                break;
            }

            const spriteIndex = this.activeSprites.findIndex(s => s.id === spriteId);

            if (spriteIndex === -1) {
                // Should not happen for valid sprites. Maybe older event reference?
                // Treat as wrong.
                this.score = Math.max(0, this.score - 5);
                this.history.push({ result: 'wrong', letter, speed: this.currentSpeed, timeOffset });
                batchFailed = true;
                break;
            }

            if (spriteIndex !== expectedIndex) {
                // Out of order! 
                // E.g. processed sprite 1 before sprite 0.
                // Fail the event.
                this.score = Math.max(0, this.score - 5);
                this.currentSpeed = Math.max(MIN_SPEED, this.currentSpeed - 0.5);
                this.history.push({ result: 'wrong', letter: `Order mismatch: Expected ${this.activeSprites[expectedIndex].letter}, Got ${letter}`, speed: this.currentSpeed, timeOffset });
                batchFailed = true;
                break;
            }

            // Correct order so far
            if (result === 'hit') {
                this.score += 10;

                // Non-linear speed increase: The higher the speed, the lower the increment.
                // We use a fraction of the remaining "distance" to MAX_SPEED.
                // At Speed 10 (Gap 80): +1.6
                // At Speed 50 (Gap 40): +0.8
                // At Speed 80 (Gap 10): +0.2
                const gap = MAX_SPEED - this.currentSpeed;
                const increment = Math.max(0.1, gap * 0.02);

                this.currentSpeed = Math.min(this.currentSpeed + increment, MAX_SPEED);
                this.history.push({ result: 'hit', letter, speed: this.currentSpeed, timeOffset });
            } else {
                // Miss
                this.score = Math.max(0, this.score - 5);
                this.currentSpeed = Math.max(MIN_SPEED, this.currentSpeed - 0.5);
                this.history.push({ result: 'miss', letter, speed: this.currentSpeed, timeOffset });
            }

            expectedIndex++;
        }

        if (batchFailed) {
            // If failed mid-batch, we might want to log remaining as skipped or just create next event?
            // The loop broke, so we stop processing.
            // Punishment already applied.
        }

        // Trigger next event immediately
        this.triggerNextSpawn(emitSpawn);

        return { score: this.score };
    }

    public abortGame() {
        this.isActive = false;
        if (this.eventTimeout) clearTimeout(this.eventTimeout);
        console.log(`Session aborted for user ${this.userId}`);
    }

    public endGame(onGameOver: (result: any) => void) {
        this.isActive = false;
        if (this.eventTimeout) clearTimeout(this.eventTimeout);

        onGameOver({
            score: this.score,
            history: this.history,
            username: 'Player' // populated by handler or preserved
        });

        // Save to DB (async, fire and forget)
        const result = new GameResult({
            userId: this.userId, // ObjectId or string if simple
            score: this.score,
            letters: this.targetLetters,
            eventLog: this.history,
            duration: Date.now() - this.startTime
        });
        result.save().catch(console.error);
    }
}
