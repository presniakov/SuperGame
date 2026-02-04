import { v4 as uuidv4 } from 'uuid';
import GameResult from '../models/GameResult';
import User from '../models/User';
import { UserProfile, PROFILES, DEFAULT_PROFILE, ComplexityBitmap, ProfileType } from './GameProfiles';
import { SessionType, SessionStrategy, getStrategy, SpawnEventResult } from './SessionStrategies';

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
    private isActive: boolean = false;

    // Difficulty params controlled by Profile & Strategy
    private profile: UserProfile;
    private strategy: SessionStrategy;
    private currentSpeed: number;
    private sessionMaxSpeed: number;
    private actualStartSpeed: number;

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
        profileType: ProfileType | string = ProfileType.CASUAL,
        sessionType: SessionType = SessionType.GRIND
    ) {
        // Resolve profile
        const pType = Object.values(ProfileType).includes(profileType as ProfileType)
            ? (profileType as ProfileType)
            : ProfileType.CASUAL;

        this.profile = PROFILES[pType] || DEFAULT_PROFILE;

        // Initialize Strategy
        this.strategy = getStrategy(sessionType, this.profile);

        // Initial Speed setup (Strategy might override in initialize, but we set defaults)
        this.currentSpeed = this.profile.startSpeed;
        this.sessionMaxSpeed = this.profile.startSpeed;

        // Run Strategy Initialization
        this.strategy.initialize(this);

        // Capture actual start speed after strategy init
        this.actualStartSpeed = this.currentSpeed;
        // Also ensure max speed starts at current if strategy lowered it (like in Calibration)
        this.sessionMaxSpeed = this.currentSpeed;

        console.log(`[GameEngine] Initialized for ${userId} | Profile: ${this.profile.name} | Session: ${sessionType} (Start: ${this.currentSpeed})`);
    }

    // --- Public Interface for Strategy ---

    public getUserId(): string { return this.userId; }
    public getSpeed(): number { return this.currentSpeed; }
    public getMaxSpeed(): number { return this.sessionMaxSpeed; }

    public setSpeed(speed: number) { this.currentSpeed = speed; }
    public setMaxSpeed(speed: number) { this.sessionMaxSpeed = speed; }

    public createSpawnEvent(complexity: number): SpawnEventResult {
        // Complexity Check: Double
        const canDouble = (complexity & ComplexityBitmap.DOUBLE) !== 0;
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
            const canFlip = (complexity & ComplexityBitmap.FLIP) !== 0;
            const isFlipped = canFlip && Math.random() < 0.2;

            // Complexity Check: Side (Flyer)
            const canSide = (complexity & ComplexityBitmap.SIDE) !== 0;
            const isSide = canSide && Math.random() > 0.4;

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

        // Delay logic? Can be part of Strategy or standard?
        // Standard random delay.
        // If Strategy wants to override, we'd need to pass it or let strategy modify result.
        // For now, standard delay.
        const delay = (300 + Math.floor(Math.random() * 700));

        return {
            eventId,
            type,
            sprites,
            size: 350,
            delay
        };
    }

    // --- Game Logic ---

    public startGame(emitSpawn: (event: any) => void, onGameOver: (result: any) => void) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isActive = true;
        this.startTime = Date.now();

        this.triggerNextSpawn(emitSpawn, true);

        // Set Timeout for Duration (if limited)
        const duration = this.strategy.getDuration();
        if (duration < 2000000000) { // If not infinite
            // Add slight buffer? No, exact duration.
            setTimeout(() => {
                if (this.isActive) this.endGame(onGameOver);
            }, duration);
        }
    }

    private triggerNextSpawn(emitSpawn: (event: any) => void, isFirst: boolean = false) {
        if (!this.isActive) return;

        // Use Strategy to generate event
        const event = this.strategy.generateSpawn(this, isFirst);
        if (isFirst) event.delay = 0; // Override delay for first

        this.activeSprites = event.sprites.map(s => ({ id: s.id, letter: s.letter, active: true }));
        this.currentEventId = event.eventId;
        this.currentEventType = event.type as 'single' | 'double';

        emitSpawn(event);
    }

    public processEventBatch(
        data: {
            eventId: string,
            results: { spriteId: string, result: 'hit' | 'miss' | 'wrong', letter: string }[],
            startTime: number,
            endTime: number
        },
        emitSpawn: (event: any) => void,
        onGameOver: (result: any) => void // Need this to end session from loop
    ) {
        if (!this.isActive) return;
        if (data.eventId !== this.currentEventId) return;

        this.currentEventId = null;
        if (data.results.length === 0) return;

        // Aggregate results for the entire batch (Event)
        const letters: string[] = [];
        let anyWrong = false;
        let anyMiss = false;
        let allHit = true;

        // Verify all items match current event context
        for (const item of data.results) {
            const index = this.activeSprites.findIndex(s => s.id === item.spriteId);
            if (index === -1) {
                // If sprite logic fails, we assume failure but continue processing
                console.warn('[GameEngine] Sprite ID mismatch in batch');
                continue;
            }

            letters.push(item.letter);

            if (item.result === 'wrong') anyWrong = true;
            if (item.result === 'miss') anyMiss = true;
            if (item.result !== 'hit') allHit = false;
        }

        // Determine Event Outcome
        // Strict: ONE Miss/Wrong fails the whole event.
        // Success: ALL must be hit.

        const eventDuration = data.endTime - data.startTime;
        // Use relative time from session start for the plot/history
        // data.endTime is client-relative, but we want server-authority alignment
        const timeOffset = Date.now() - this.startTime;
        const combinedLetter = letters.join('+');

        if (allHit) {
            // Validate that we actually hit ALL target sprites
            // If activeSprites.length > letters.length, we missed some?
            // "data.results" contains what client sent. 
            // We only pushed to "letters" if IDs matched.
            // If letters.length < this.activeSprites.length, something is wrong.
            if (letters.length < this.activeSprites.length) {
                // Partial success is NOT success/hit for the event logic
                this.strategy.handleFailure(this);
                this.history.push({
                    result: 'miss', // Treat incomplete as miss
                    letter: combinedLetter || 'ERR',
                    speed: this.currentSpeed,
                    timeOffset,
                    eventType: this.currentEventType,
                    eventDuration
                });
            } else {
                this.score += (10 * letters.length);
                this.strategy.handleSuccess(this);
                this.history.push({
                    result: 'hit',
                    letter: combinedLetter,
                    speed: this.currentSpeed,
                    timeOffset,
                    eventType: this.currentEventType,
                    eventDuration
                });
            }
        } else {
            // Failure
            this.strategy.handleFailure(this);
            const resultType = anyWrong ? 'wrong' : 'miss';
            this.history.push({
                result: resultType,
                letter: combinedLetter,
                speed: this.currentSpeed,
                timeOffset,
                eventType: this.currentEventType,
                eventDuration
            });
        }


        // Check End Condition (e.g. Calibration Event Count)
        const elapsed = Date.now() - this.startTime;
        if (this.strategy.shouldEndSession(this, elapsed)) {
            this.endGame(onGameOver);
            return;
        }

        this.triggerNextSpawn(emitSpawn);
    }

    public abortGame() {
        this.isActive = false;
        if (this.eventTimer) clearTimeout(this.eventTimer);
    }

    public endGame(onGameOver: (result: any) => void) {
        if (!this.isActive) return; // Prevent double calls

        this.isActive = false;
        if (this.eventTimer) clearTimeout(this.eventTimer);
        const totalDuration = Date.now() - this.startTime;

        onGameOver({
            score: this.score,
            history: this.history,
            username: 'Player',
            sessionType: this.strategy.type
        });

        const isCalibration = this.strategy.type === SessionType.CALIBRATION;
        if (!isCalibration && totalDuration < 10000 && this.strategy.getDuration() > 60000) {
            // Short session ignored unless it's Calibration or a short strategy
            return;
        }

        const result = new GameResult({
            userId: this.userId,
            score: this.score,
            letters: this.targetLetters,
            eventLog: this.history,
            duration: totalDuration,
            date: new Date(),
            sessionType: this.strategy.type,
            userProfile: this.profile.name
        });

        this.saveGameData(totalDuration, result).catch(err => {
            console.error(`[SERVER] Failed save:`, err);
        });
    }

    private async saveGameData(totalDuration: number, gameResult: any) {
        // Filter out events excluded from stats (e.g. Cooldown)
        const validEvents = this.history.filter(h => !h.excludeFromStats);

        const time23 = totalDuration * (2 / 3);
        const eventsFirst23 = validEvents.filter(h => h.timeOffset <= time23);
        const eventsLast13 = validEvents.filter(h => h.timeOffset > time23);

        const calculateErrorRate = (events: any[]) => {
            if (events.length === 0) return 0;
            const errors = events.filter(e => e.result === 'miss' || e.result === 'wrong').length;
            return (errors / events.length) * 100;
        };

        const errorRateFirst23 = calculateErrorRate(eventsFirst23);
        const errorRateLast13 = calculateErrorRate(eventsLast13);
        const totalErrorRate = calculateErrorRate(validEvents);

        // Calculate score based on Valid Events only
        const totalScore = Math.max(0, Math.floor(
            (this.sessionMaxSpeed * 10) +
            (validEvents.length * 5) -
            (totalErrorRate * 20)
        ));

        gameResult.statistics = {
            startSpeed: this.actualStartSpeed,
            // If sessionMaxSpeed was updated during cooldown (though it shouldn't be per rules), 
            // strictly we might want to track max speed of valid events? 
            // For now, assume strategy manages maxSpeed correctly or we use current.
            maxSpeed: this.sessionMaxSpeed,
            totalScore,
            totalErrorRate,
            errorRateFirst23,
            errorRateLast13
        };

        await gameResult.save();

        if (!this.userId || this.userId === 'anon') return;

        try {
            const user = await User.findById(this.userId);
            if (user) {
                // Update Total Sessions
                user.totalSessionsPlayed = (user.totalSessionsPlayed || 0) + 1;

                // Snapshot the session number for this result
                gameResult.sessionNumber = user.totalSessionsPlayed;
                await gameResult.save();

                // Clear Forced Session if it was used
                if (user.preferences?.forceSessionType) {
                    user.preferences.forceSessionType = undefined;
                }

                const currentGlobalMax = user.statistics?.global?.maxSpeed || 0;
                if (this.sessionMaxSpeed > currentGlobalMax) {
                    user.statistics = {
                        global: {
                            maxSpeed: this.sessionMaxSpeed
                        }
                    };
                }
                await user.save();
            }
        } catch (e) { console.error(e); }
    }
}
