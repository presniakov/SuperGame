export interface SpriteData {
    id: string;
    letter: string;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    isFlipped?: boolean;
}

export interface SpawnEvent {
    eventId: string;
    type: 'single' | 'double';
    sprites: SpriteData[];
    timestamp: number; // server timestamp if needed, but we rely on delay
    size: number;
    delay: number; // milliseconds to wait after PREVIOUS event end before starting this one
    phase: string; // Phase name for visibility
}

export interface EventCompletionData {
    eventId: string;
    results: {
        spriteId: string;
        result: 'hit' | 'miss' | 'wrong';
        letter: string;
    }[];
    startTime: number; // ms relative to session start
    endTime: number; // ms relative to session start
}

export interface GameHistoryEvent {
    result: 'hit' | 'miss' | 'wrong';
    letter: string;
    speed: number;
    timeOffset: number;
    eventType?: 'single' | 'double';
    eventDuration?: number;
}

export type GameStyle = 'cyber' | 'hi-tech' | 'steam';

export interface GameResultData {
    score: number;
    history: GameHistoryEvent[];
    username?: string;
}

export interface IGameResult {
    _id: string;
    userId: string;
    date: string;
    score: number;
    statistics?: {
        startSpeed: number;
        maxSpeed: number;
        totalScore: number;
        totalErrorRate: number;
        errorRateFirst23: number;
        errorRateLast13: number;
    };
    eventLog: GameHistoryEvent[];
    duration: number;
    sessionType?: string;
    sessionNumber?: number;
    userProfile?: string;
}

export const ProfileType = {
    SUPPORT: 'Support',
    STEADY: 'Steady',
    CASUAL: 'Casual',
    ACTIVE: 'Active',
    ELITE: 'Elite',
    UNDEFINED: 'Undefined'
} as const;

export type ProfileType = typeof ProfileType[keyof typeof ProfileType];

export const SessionType = {
    CALIBRATION: 'Calibration',
    GRIND: 'The Grind',
    BREAKTHROUGH: 'The Breakthrough',
    RECOVERY: 'Recovery'
} as const;

export type SessionType = typeof SessionType[keyof typeof SessionType];


