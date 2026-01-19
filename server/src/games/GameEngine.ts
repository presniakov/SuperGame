import { v4 as uuidv4 } from 'uuid';
import GameResult from '../models/GameResult';

// Constants roughly estimating letter size in our 0-100 coordinate system
const LETTER_SIZE = 5; // assumes ~5% screen size
const DOUBLE_OFFSET_X = (2 / 3) * LETTER_SIZE;
const DOUBLE_DISTANCE_Y = 1.5 * LETTER_SIZE;

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
    private currentSpeed: number = 10; // units per second

    // Event State
    private activeSprites: SpriteState[] = [];
    private eventTimeout: NodeJS.Timeout | null = null;

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
        // Start countdown or just start loop? 
        // Logic assumes countdown handled by handler. 
        // We trigger first spawn.
        this.scheduleNextEvent(emitSpawn, 0);

        // End game timer
        setTimeout(() => {
            this.endGame(onGameOver);
        }, this.duration);
    }

    private scheduleNextEvent(emitSpawn: (event: any) => void, delay: number) {
        if (!this.isActive) return;

        this.eventTimeout = setTimeout(() => {
            const event = this.generateSpawn();
            // Track active sprites
            this.activeSprites = event.sprites.map(s => ({ id: s.id, letter: s.letter, active: true }));
            emitSpawn(event);
        }, delay);
    }

    private generateSpawn() {
        // Determine type: Single/Double (start with 50/50 or adaptive?)
        // Let's make it random for now.
        const isDouble = Math.random() > 0.5;

        const type = isDouble ? 'double' : 'single';
        const eventId = uuidv4();
        const sprites = [];

        // Pick letters
        // For single: pick 1 random from targetLetters
        // For double: pick 2 (can be same or different)

        const l1 = this.targetLetters[Math.floor(Math.random() * this.targetLetters.length)];

        // Base X (keep within bounds 0-100 minus margins)
        // Margin ~10
        const startX = 10 + Math.random() * 80;

        if (type === 'single') {
            // Random direction or Top-Down? User said "single event is a single letter". 
            // Didn't strictly enforce Top-Down for single, but "double event is top-down ONLY".
            // Let's keep single random direction for variety as originally implemented, 
            // OR make it Top-Down too for consistency. 
            // User: "double event is two letters moving in the same top-down only direction".
            // Implies single might be different. Let's stick to Top-Down for consistency with "dropping letters" genre unless specified.
            // Actually, original design was "moving randomly".
            // Let's mix it: Single = Random, Double = Top-Down (Strict).

            const isVertical = Math.random() > 0.5;
            // If random direction:
            // Top->Down, Bottom->Up, Left->Right, Right->Left
            // Simplified: Vertical top-down or Horizontal L->R

            let vx = 0, vy = 0;
            let sx = startX, sy = -10;

            if (isVertical) {
                vy = this.currentSpeed;
                sy = -10;
            } else {
                vx = (Math.random() > 0.5 ? 1 : -1) * this.currentSpeed;
                vy = (Math.random() - 0.5) * this.currentSpeed * 0.5; // slight wobble
                sy = 10 + Math.random() * 80;
                sx = vx > 0 ? -10 : 110;
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
            const l2 = this.targetLetters[Math.floor(Math.random() * this.targetLetters.length)];

            // Letter 1
            sprites.push({
                id: uuidv4(),
                letter: l1,
                startX: startX,
                startY: -10,
                velocityX: 0,
                velocityY: this.currentSpeed
            });

            // Letter 2 (Offset and Distance)
            sprites.push({
                id: uuidv4(),
                letter: l2,
                startX: startX + DOUBLE_OFFSET_X,
                startY: -10 - DOUBLE_DISTANCE_Y,
                velocityX: 0,
                velocityY: this.currentSpeed
            });
        }

        return {
            eventId,
            type,
            sprites
        };
    }

    public processResult(
        data: { result: 'hit' | 'miss' | 'wrong', letter: string, spriteId?: string },
        emitSpawn: (event: any) => void
    ) {
        if (!this.isActive) return;

        let { result, letter, spriteId } = data;
        const timeOffset = Date.now() - this.startTime;

        // Sort active sprites by Y position (descending) to determine "first appeared" (effectively bottom-most)
        // Since they move Top-Down, larger Y means "more active" / "appeared earlier".
        // Use a small epsilon for float comparison if needed, but strict sort is fine.

        // Filter only currently active sprites
        const active = this.activeSprites.filter(s => s.active);

        if (active.length === 0) return; // Event already finished or processing

        // Simulate positions? 
        // We don't track exact Y on server continuously. 
        // But we know relative order never changes if velocities are identical (Double Event).
        // For Single event, it's just one.
        // For Double event, Sprite 1 (first pushed) was at Y=-10, Sprite 2 at Y=-25.
        // So Sprite 1 is always "ahead" (larger Y).
        // Therefore, expected order is the order they were pushed to activeSprites array? 
        // My generateSpawn pushed: letter 1 (Y=-10) THEN letter 2 (Y=-25).
        // So index 0 is always the target.

        const expectedSprite = active[0];

        // Validation Logic
        let isValidHit = false;

        if (result === 'wrong') {
            // "Wrong key press" -> Fail Event immediately
            isValidHit = false;
        } else if (result === 'hit') {
            // check if correct letter AND correct order
            if (letter === expectedSprite.letter && (!spriteId || spriteId === expectedSprite.id)) {
                isValidHit = true;
            } else {
                // Good letter but wrong order (or wrong sprite if duplicates) -> Fail Event
                isValidHit = false;
                result = 'wrong'; // escalate to wrong (penalty)
            }
        } else if (result === 'miss') {
            // Miss is just a miss of that specific sprite. 
            // If we missed the first one, the second one might still be active?
            // "next event does not occur until previous has finished".
            // If sprite 1 missed, it is removed. Sprite 2 becomes head of queue? 
            // User: "The next event does not occures until the previous has finished".
            // Standard logic: just mark this sprite as missed/inactive.
            // But if we missed the *first* one, is the second one still playable? 
            // Usually yes.
            isValidHit = false; // it's a miss, not a hit
        }

        // Apply Outcome
        if (isValidHit) {
            // Success
            this.history.push({ result: 'hit', letter, speed: this.currentSpeed, timeOffset });
            this.score += 10;
            this.currentSpeed = Math.min(this.currentSpeed + 0.5, 50);

            // Mark SPECIFIC sprite inactive
            const targetIdx = this.activeSprites.findIndex(s => s.id === expectedSprite.id);
            if (targetIdx !== -1) this.activeSprites[targetIdx].active = false;

        } else if (result === 'miss') {
            // Just a miss (ran off screen)
            this.history.push({ result: 'miss', letter: expectedSprite.letter, speed: this.currentSpeed, timeOffset });
            this.score = Math.max(0, this.score - 5);
            this.currentSpeed = Math.max(5, this.currentSpeed - 0.5);

            // Remove the missed sprite
            // (Client sent miss for specific letter/id usually)
            // If client sent miss for `letter`, find it.
            // CAREFUL: Client sends "miss" when sprite bounds exit. 
            // That might happen to sprite 2 while sprite 1 is still on screen? (Unlikely in double top-down if different Y).
            // Actually, sprite 1 exits first. 
            // So if we get a miss, it should correspond to expectedSprite.

            const targetIdx = this.activeSprites.findIndex(s => s.id === (spriteId || expectedSprite.id));
            if (targetIdx !== -1) this.activeSprites[targetIdx].active = false;

        } else {
            // WRONG KEY or Out of Order -> Fail ENTIRE Event
            // End all active sprites in this event
            this.history.push({ result: 'wrong', letter: letter || '?', speed: this.currentSpeed, timeOffset });
            this.score = Math.max(0, this.score - 5);
            this.currentSpeed = Math.max(5, this.currentSpeed - 0.5);

            // Mark ALL inactive to trigger end of event
            this.activeSprites.forEach(s => s.active = false);
            // Optionally emit 'force_clear' to client? 
            // Client will just see new spawn eventually? 
            // Or client needs to know to wipe sprites? 
            // User didn't specify, but "event ended with failure" implies we stop waiting.
        }

        // Check if event complete
        if (this.activeSprites.every(s => !s.active)) {
            const randomDelay = 250 + Math.random() * 950;
            this.scheduleNextEvent(emitSpawn, randomDelay);
        }

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
