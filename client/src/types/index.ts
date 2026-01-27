export interface SpriteData {
    id: string;
    letter: string;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
}

export interface SpawnEvent {
    eventId: string;
    type: 'single' | 'double';
    sprites: SpriteData[];
    timestamp?: number; // server timestamp if needed, but we rely on delay
    size?: number;
    delay?: number; // milliseconds to wait after PREVIOUS event end before starting this one
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
}

export type GameStyle = 'cyber' | 'hi-tech' | 'steam';

export interface GameResultData {
    score: number;
    history: GameHistoryEvent[];
    username?: string;
}
