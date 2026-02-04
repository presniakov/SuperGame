import mongoose, { Schema, Document } from 'mongoose';

export interface IGameEvent {
    timeOffset: number;
    speed: number;
    result: 'hit' | 'miss' | 'wrong';
    letter: string;
    eventType: 'single' | 'double';
    eventDuration: number;
    excludeFromStats?: boolean;
}

// Interface
export interface IGameResult extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    statistics?: {
        startSpeed: number;
        maxSpeed: number;
        totalScore: number;
        errorRateFirst23: number;
        errorRateLast13: number;
        totalErrorRate: number;
    };
    eventLog: IGameEvent[];
    sessionType?: string;
    sessionNumber?: number;
    userProfile?: string;
}

const GameResultSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    sessionType: { type: String, default: 'The Grind' },
    sessionNumber: { type: Number },
    userProfile: { type: String },
    statistics: {
        startSpeed: Number,
        maxSpeed: Number,
        totalScore: Number,
        totalErrorRate: Number,
        errorRateFirst23: Number,
        errorRateLast13: Number
    },
    eventLog: [{
        timeOffset: Number,
        speed: Number,
        result: String,
        letter: String,
        eventType: String,
        eventDuration: Number,
        excludeFromStats: Boolean
    }]
});

export default mongoose.model<IGameResult>('GameResult', GameResultSchema);
