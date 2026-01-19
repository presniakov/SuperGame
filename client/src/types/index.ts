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
    timestamp?: number;
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
