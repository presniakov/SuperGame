import { v4 as uuidv4 } from 'uuid';
import GameResult from '../models/GameResult';
import User from '../models/User';
import { UserProfile, PROFILES, DEFAULT_PROFILE, ComplexityBitmap, ProfileType } from './GameProfiles';

const LETTER_SIZE = 5; // units
const SIZE_PX = 350; // px reference
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;
const SIZE_X = (SIZE_PX / REF_WIDTH) * 100; // ~18.2
const SIZE_Y = (SIZE_PX / REF_HEIGHT) * 100; // ~32.4
const GAP_RATIO = 1 / 3;
const GAP_X = SIZE_X * GAP_RATIO;
const DIST_Y = SIZE_Y - (SIZE_Y * GAP_RATIO);
const DOUBLE_WIDTH = (2 * SIZE_X) + GAP_X;

interface SpriteState {
    id: string;
    letter: string;
    active: boolean;
}

export class GameSession {
    private score: number = 0;
    private history: any[] = [];
    private startTime: number = 0;
    private duration: number = 3 * 60 * 1000;
    private isActive: boolean = false;

    // Difficulty params controlled by Profile
    private profile: UserProfile;
    private currentSpeed: number;
    private sessionMaxSpeed: number;

    // Event State
    private activeSprites: SpriteState[] = [];
    private currentEventId: string | null = null;
    private currentEventType: 'single' | 'double' = 'single';
    private eventTimer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(
        private socketId: string,
        private userId: string,
        private targetLetters: string[],
        profileType: ProfileType | string = ProfileType.CASUAL
    ) {
        // Resolve profile
        const pType = Object.values(ProfileType).includes(profileType as ProfileType)
            ? (profileType as ProfileType)
            : ProfileType.CASUAL;

        this.profile = PROFILES[pType] || DEFAULT_PROFILE;

        this.currentSpeed = this.profile.startSpeed;
        this.sessionMaxSpeed = this.profile.startSpeed;

        console.log(`[GameEngine] Initialized for ${userId} with Profile: ${this.profile.name} (Start: ${this.currentSpeed}, Cap: ${this.profile.globalCap})`);
    }

    public getUserId(): string {
        return this.userId;
    }

    public startGame(emitSpawn: (event: any) => void, onGameOver: (result: any) => void) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isActive = true;
        this.startTime = Date.now();

        this.triggerNextSpawn(emitSpawn, true);

        setTimeout(() => {
            this.endGame(onGameOver);
        }, this.duration);
    }

    private triggerNextSpawn(emitSpawn: (event: any) => void, isFirst: boolean = false) {
        if (!this.isActive) return;
        const event = this.generateSpawn(isFirst);

        this.activeSprites = event.sprites.map(s => ({ id: s.id, letter: s.letter, active: true }));
        this.currentEventId = event.eventId;
        this.currentEventType = event.type as 'single' | 'double';

        emitSpawn(event);
    }

    private generateSpawn(isFirst: boolean = false) {
        // Complexity Check: Double
        const canDouble = (this.profile.complexity & ComplexityBitmap.DOUBLE) !== 0;
        const isDouble = canDouble && Math.random() > 0.5;

        const type = isDouble ? 'double' : 'single';
        const eventId = uuidv4();
        const sprites = [];

        const l1 = this.targetLetters[Math.floor(Math.random() * this.targetLetters.length)];

        const margin = 2;
        let maxStart = 100 - margin - SIZE_X;
        if (type === 'double') {
            maxStart = 100 - margin - DOUBLE_WIDTH;
        }
        maxStart = Math.max(margin, maxStart);
        const startX = margin + Math.random() * (maxStart - margin);

        if (type === 'single') {
            let vx = 0;
            let sx = startX, sy = -20;
            let vy = this.currentSpeed;

            // Complexity Check: Flip
            const canFlip = (this.profile.complexity & ComplexityBitmap.FLIP) !== 0;
            const isFlipped = canFlip && Math.random() < 0.2;

            // Complexity Check: Side (Flyer)
            const canSide = (this.profile.complexity & ComplexityBitmap.SIDE) !== 0;
            const isSide = canSide && Math.random() > 0.4; // 60% chance logic preserved from original as inversed

            if (!isSide) {
                // Vertical Fall
                sx = startX;
                sy = -SIZE_Y;
            } else {
                // Horizontal Flyer
                vx = (Math.random() > 0.5 ? 1 : -1) * this.currentSpeed;
                vy = 0;
                sy = 10 + Math.random() * 60;
                sx = vx > 0 ? -SIZE_X : 100;
            }

            sprites.push({
                id: uuidv4(),
                letter: l1,
                startX: sx,
                startY: sy,
                velocityX: vx,
                velocityY: vy,
                isFlipped
            });

        } else {
            // Double: Top-Down Only
            let l2 = l1;
            if (this.targetLetters.length > 1) {
                l2 = this.targetLetters[Math.floor(Math.random() * this.targetLetters.length)];
            }

            sprites.push({
                id: uuidv4(),
                letter: l1,
                startX: startX,
                startY: -SIZE_Y,
                velocityX: 0,
                velocityY: this.currentSpeed
            });

            sprites.push({
                id: uuidv4(),
                letter: l2,
                startX: startX + SIZE_X + GAP_X,
                startY: -SIZE_Y - DIST_Y,
                velocityX: 0,
                velocityY: this.currentSpeed
            });
        }

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
        if (data.eventId !== this.currentEventId) return;

        this.currentEventId = null;
        let expectedIndex = 0;
        let batchFailed = false;

        for (const item of data.results) {
            const { result, letter, spriteId } = item;
            const timeOffset = data.endTime;
            const eventDuration = data.endTime - data.startTime;

            if (result === 'wrong') {
                this.punish();
                this.history.push({ result: 'wrong', letter, speed: this.currentSpeed, timeOffset, eventType: this.currentEventType, eventDuration });
                batchFailed = true;
                break;
            }

            const spriteIndex = this.activeSprites.findIndex(s => s.id === spriteId);

            if (spriteIndex === -1 || spriteIndex !== expectedIndex) {
                this.punish();
                this.history.push({ result: 'wrong', letter: `Order mismatch`, speed: this.currentSpeed, timeOffset, eventType: this.currentEventType, eventDuration });
                batchFailed = true;
                break;
            }

            if (result === 'hit') {
                this.score += 10;
                this.reward();
                this.history.push({ result: 'hit', letter, speed: this.currentSpeed, timeOffset, eventType: this.currentEventType, eventDuration });
            } else {
                this.punish();
                this.history.push({ result: 'miss', letter, speed: this.currentSpeed, timeOffset, eventType: this.currentEventType, eventDuration });
            }

            expectedIndex++;
        }

        this.triggerNextSpawn(emitSpawn);
    }

    private punish() {
        this.score = Math.max(0, this.score - 5);

        // Failure: S_next = S_curr - k_down * (S_curr - S_start)
        const drop = this.profile.kDown * (this.currentSpeed - this.profile.startSpeed);
        // Ensure we don't drop below startSpeed (or min speed if start is too low?)
        // Formula naturally converges to S_start.
        this.currentSpeed = Math.max(this.profile.startSpeed, this.currentSpeed - drop);
    }

    private reward() {
        const gap = this.profile.globalCap - this.currentSpeed;
        if (gap <= 0) return;

        // Success: S_next = S_curr + k_up * (Omega - S_curr)
        // Note: The formula provided is clean asymptotic approach.
        // Ignore growthRate? User prompt only mentioned k_up.
        // Wait, "Growth Rate" in profile is 0.08, 0.1 etc. 
        // User prompt says: "S_next = S_curr + k_up * (Omega - S_curr)"
        // But user provided K up: 0.1, K down: 0.2.
        // AND "Growth Rate" in profile definition.
        // Let's re-read the previous prompt/profile definition.
        // Profile: kUp: 0.1 (constant?), Growth Rate: 0.08.
        // The formula uses "k_up". 
        // The user might mean the profile field `growthRate` acts as the coefficient?
        // OR the profile field `kUp` acts as the coefficient?
        // In Asymptotic growth, the factor multiplying the gap is the rate.
        // Usually "Growth Rate" -> Rate.
        // "K up" -> maybe a constant boost?
        // Let's look at the formula carefully: "S_next = S_curr + k_up * ... "
        // It uses `k_up` as the multiplier.
        // BUT, if I look at my `GameProfiles.ts`:
        // kUp: 0.1
        // growthRate: 0.08
        // If I use 0.1 as the multiplier, it's quite fast convergence.
        // If I use 0.08, it's similar.
        // Let's try to infer from values.
        // Elite: Start 285, Cap 555. Gap ~270.
        // If rate is 0.1 (kUp), step is 27.
        // If rate is 0.25 (growthRate), step is 67.5. Huge acceleration.
        // Casual: Start 111, Cap 285. Gap ~174.
        // Rate 0.1 -> 17.
        // Rate 0.15 -> 26.
        // The `growthRate` variable changes with difficulty. `kUp` does not.
        // Therefore, `growthRate` must be the coefficient controlling the curve steepness.
        // I will use `this.profile.growthRate` as the `k_up` in the formula.
        // I will rename the variable in comments to avoid confusion, or assume `k_up` in user notation maps to `growthRate` in code.
        // Wait, "K up" is in the profile. Maybe I should use that?
        // But `kUp` is 0.1 everywhere.
        // User said: "Success: S_next = S_curr + k_up * (Omega - S_curr)".
        // If I use the constant 0.1, then 'Elite' and 'Casual' have same convergence speed relative to gap.
        // That seems wrong. Elite should be harder/faster? 
        // Actually, if Elite has higher start and high cap, maybe constant rate is fine?
        // BUT `growthRate` is in the profile and unused if I ignore it.
        // Let's assume the user made a notation slip and meant `growthRate` OR that my `GameProfiles.ts` `kUp` value is just a placeholder and `growthRate` is the real one.
        // Let's look at `GameProfiles.ts` again.
        // Support: growth 0.08. Steady: 0.1. Casual: 0.15. Active: 0.2. Elite: 0.25.
        // This variation strongly suggests THIS is the factor.
        // I will use `this.profile.growthRate`.

        // User explicitly requested to use kUp instead of growthRate.
        const increment = this.profile.kUp * gap;
        this.currentSpeed = Math.min(this.profile.globalCap, this.currentSpeed + increment);
        this.sessionMaxSpeed = Math.max(this.sessionMaxSpeed, this.currentSpeed);
    }

    public abortGame() {
        this.isActive = false;
        if (this.eventTimer) clearTimeout(this.eventTimer);
    }

    public endGame(onGameOver: (result: any) => void) {
        this.isActive = false;
        if (this.eventTimer) clearTimeout(this.eventTimer);
        const totalDuration = Date.now() - this.startTime;

        onGameOver({
            score: this.score,
            history: this.history,
            username: 'Player'
        });

        if (totalDuration < 20000) return;

        const result = new GameResult({
            userId: this.userId,
            score: this.score,
            letters: this.targetLetters,
            eventLog: this.history,
            duration: totalDuration,
            date: new Date()
        });

        this.saveGameData(totalDuration, result).catch(err => {
            console.error(`[SERVER] Failed save:`, err);
        });
    }

    private async saveGameData(totalDuration: number, gameResult: any) {
        const time23 = totalDuration * (2 / 3);
        const eventsFirst23 = this.history.filter(h => h.timeOffset <= time23);
        const eventsLast13 = this.history.filter(h => h.timeOffset > time23);

        const calculateErrorRate = (events: any[]) => {
            if (events.length === 0) return 0;
            const errors = events.filter(e => e.result === 'miss' || e.result === 'wrong').length;
            return (errors / events.length) * 100;
        };

        const errorRateFirst23 = calculateErrorRate(eventsFirst23);
        const errorRateLast13 = calculateErrorRate(eventsLast13);
        const totalErrorRate = calculateErrorRate(this.history);

        const totalScore = Math.max(0, Math.floor(
            (this.sessionMaxSpeed * 10) +
            (this.history.length * 5) -
            (totalErrorRate * 20)
        ));

        gameResult.statistics = {
            startSpeed: this.profile.startSpeed, // Record profile start speed
            maxSpeed: this.sessionMaxSpeed,
            totalScore,
            errorRateFirst23,
            errorRateLast13
        };

        await gameResult.save();

        if (!this.userId || this.userId === 'anon') return;

        try {
            const user = await User.findById(this.userId);
            if (user) {
                const currentGlobalMax = user.statistics?.global?.maxSpeed || 0;
                if (this.sessionMaxSpeed > currentGlobalMax) {
                    user.statistics = { global: { maxSpeed: this.sessionMaxSpeed } };
                    await user.save();
                }
            }
        } catch (e) { console.error(e); }
    }
}
