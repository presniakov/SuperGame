import { UserProfile, ComplexityBitmap, ProfileType, PROFILES, DEFAULT_PROFILE, COMPLEXITY_ALL } from './GameProfiles';
import { GameSession } from './GameEngine';

export enum SessionType {
    CALIBRATION = 'Calibration',
    GRIND = 'The Grind',
    BREAKTHROUGH = 'The Breakthrough',
    RECOVERY = 'Recovery'
}

export interface SpawnEventResult {
    eventId: string;
    sprites: any[];
    type: string;
    size: number;
    delay: number;
}

export interface SessionStrategy {
    type: SessionType;
    getDuration(): number;
    initialize(session: GameSession): void;
    generateSpawn(session: GameSession, isFirst: boolean): SpawnEventResult;
    handleSuccess(session: GameSession): void;
    handleFailure(session: GameSession): void;
    shouldEndSession(session: GameSession, timeElapsed: number): boolean;
}

// Helper to create basic spawn data
// We need to access GameSession private methods or move generation logic here?
// Ideally, generation logic should be flexible. 
// For now, we will expose needed props from GameSession or pass them.
// Refactoring GameEngine to separate generation logic is part of the plan.
// We will assume GameEngine exposes a 'createSpawnEvent(complexity, speed)' or similar, 
// OR we implement generation here using session state.
// Let's implement generation logic HERE or in a shared helper, and Session uses it.
// To avoid massive refactor of 'generateSpawn' in GameEngine AND here, 
// let's keep the low-level geometry/sprite creation in GameEngine (or a helper) 
// and high-level decisions (single/double, speed changes) here.

// Actually, low level generation is tight with 'targetLetters' etc.
// Let's define `generateSpawn` in Strategy to return the *parameters* for generation, 
// or fully generate it if we pass context. 
// Simplest: Strategy decides `complexity` (single/double/etc) and `speed` (implied by session state).
// But `GameEngine.generateSpawn` does the heavy lifting of geometry.
// Let's modify `GameEngine` to take configuration from Strategy?
// Or better: Strategy *contains* the specific logic for Success/Fail and End conditions.
// Generation: The "Breakthrough" needs locked speed. "Recovery" needs no double/flip.
// So Strategy should act as a Configuration Provider during generation.

export abstract class BaseStrategy implements SessionStrategy {
    abstract type: SessionType;

    constructor(protected profile: UserProfile) { }

    abstract getDuration(): number;

    initialize(session: GameSession): void {
        // Default: Set start speed from profile
        session.setSpeed(this.profile.startSpeed);
        session.setMaxSpeed(this.profile.startSpeed);
    }

    // Default Generation Logic (can be overridden)
    generateSpawn(session: GameSession, isFirst: boolean): SpawnEventResult {
        // Delegate back to engine but providing complexity context?
        // Or we duplicate the generation logic? 
        // Let's call a public method on Session that does the math, but we control the flags.
        // session.generateEvent(allowedComplexity, speedOverride?)
        return session.createSpawnEvent(this.profile.complexity);
    }

    abstract handleSuccess(session: GameSession): void;
    abstract handleFailure(session: GameSession): void;

    shouldEndSession(session: GameSession, timeElapsed: number): boolean {
        return timeElapsed >= this.getDuration();
    }
}

export class CalibrationStrategy extends BaseStrategy {
    type = SessionType.CALIBRATION;
    private eventsProcessed = 0;
    private readonly MAX_EVENTS = 10;
    private readonly CALIBRATION_START = 125;

    constructor(profile: UserProfile) {
        super(profile);
    }

    getDuration(): number {
        return 24 * 60 * 60 * 1000; // Effectively infinite, ends on count
    }

    initialize(session: GameSession): void {
        session.setSpeed(this.CALIBRATION_START);
        session.setMaxSpeed(this.CALIBRATION_START);
    }

    generateSpawn(session: GameSession, isFirst: boolean): SpawnEventResult {
        // Calibration: Minimal complexity - SIDE only
        return session.createSpawnEvent(ComplexityBitmap.SIDE);
    }

    handleSuccess(session: GameSession): void {
        // +15 units/s
        const current = session.getSpeed();
        const next = current + 15;
        session.setSpeed(next);
        session.setMaxSpeed(Math.max(session.getMaxSpeed(), next));
        this.eventsProcessed++;
    }

    handleFailure(session: GameSession): void {
        // -25 units/s
        const current = session.getSpeed();
        session.setSpeed(Math.max(10, current - 25));
        this.eventsProcessed++;
    }

    shouldEndSession(session: GameSession, timeElapsed: number): boolean {
        return this.eventsProcessed >= this.MAX_EVENTS;
    }
}

export class GrindStrategy extends BaseStrategy {
    type = SessionType.GRIND;

    getDuration(): number {
        return 3 * 60 * 1000; // 3 mins
    }

    handleSuccess(session: GameSession): void {
        const current = session.getSpeed();
        const gap = this.profile.globalCap - current;
        if (gap <= 0) return;

        const increment = this.profile.kUp * gap;
        const next = Math.min(this.profile.globalCap, current + increment);
        session.setSpeed(next);
        session.setMaxSpeed(Math.max(session.getMaxSpeed(), next));
    }

    handleFailure(session: GameSession): void {
        const current = session.getSpeed();
        const drop = this.profile.kDown * (current - this.profile.startSpeed);
        session.setSpeed(Math.max(this.profile.startSpeed, current - drop));
    }
}

export class BreakthroughStrategy extends BaseStrategy {
    type = SessionType.BREAKTHROUGH;

    getDuration(): number {
        return 60 * 1000; // 60s
    }

    initialize(session: GameSession): void {
        // Locked at Omega (Global Cap)
        session.setSpeed(this.profile.globalCap);
        session.setMaxSpeed(this.profile.globalCap);
    }

    handleSuccess(session: GameSession): void {
        // No speed change
    }

    handleFailure(session: GameSession): void {
        // No speed change
    }
}

export class RecoveryStrategy extends BaseStrategy {
    type = SessionType.RECOVERY;

    getDuration(): number {
        return 3 * 60 * 1000;
    }

    initialize(session: GameSession): void {
        // Goal Reduced by 30%? Start Speed?
        // Logic: Floor frozen. 
        // Let's set start speed as normal.
        session.setSpeed(this.profile.startSpeed);
        session.setMaxSpeed(this.profile.startSpeed);
    }

    generateSpawn(session: GameSession, isFirst: boolean): SpawnEventResult {
        // High-stress complexities disabled
        // Disable DOUBLE and FLIP?
        // Keep SIDE? 
        // "High-stress complexities disabled" -> likely just simple falling.
        // Let's disable DOUBLE and FLIP.
        const simplified = this.profile.complexity & ~(ComplexityBitmap.DOUBLE | ComplexityBitmap.FLIP);
        return session.createSpawnEvent(simplified);
    }

    handleSuccess(session: GameSession): void {
        // Goal reduced by 30%. 
        const reducedCap = this.profile.globalCap * 0.7;

        const current = session.getSpeed();
        const gap = reducedCap - current;
        if (gap <= 0) return;

        const increment = this.profile.kUp * gap; // Use normal rate?
        const next = Math.min(reducedCap, current + increment);
        session.setSpeed(next);
        session.setMaxSpeed(Math.max(session.getMaxSpeed(), next));
    }

    handleFailure(session: GameSession): void {
        // Floor Frozen -> No drop?
        // "Floor frozen" usually means we don't drop speed on miss?
        // Or we don't drop below start? (Normal behavior is don't drop below start).
        // Let's assume "Floor Frozen" means speed does not decrease on error.
    }
}

export function getStrategy(type: SessionType, profile: UserProfile): SessionStrategy {
    switch (type) {
        case SessionType.CALIBRATION: return new CalibrationStrategy(profile);
        case SessionType.GRIND: return new GrindStrategy(profile);
        case SessionType.BREAKTHROUGH: return new BreakthroughStrategy(profile);
        case SessionType.RECOVERY: return new RecoveryStrategy(profile);
        default: return new GrindStrategy(profile);
    }
}
