import mongoose, { Schema, Document } from 'mongoose';

export interface IGameEvent {
    timeOffset: number;
    speed: number;
    result: 'hit' | 'miss' | 'wrong';
    letter: string;
    eventType: 'single' | 'double';
    eventDuration: number;
}

export interface IGameResult extends Document {
    userId: mongoose.Types.ObjectId; // Optional for now if no auth enforcement
    date: Date;
    statistics?: {
        startSpeed: number;
        maxSpeed: number;
        totalScore: number;
        errorRateFirst23: number;
        errorRateLast13: number;
    };
    eventLog: IGameEvent[];
}

const GameResultSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Can be null for guest?
    date: { type: Date, default: Date.now },
    statistics: {
        startSpeed: Number,
        maxSpeed: Number,
        totalScore: Number,
        errorRateFirst23: Number,
        errorRateLast13: Number
    },
    eventLog: [{
        timeOffset: Number,
        speed: Number,
        result: String,
        letter: String,
        eventType: String,
        eventDuration: Number
    }]
});

export default mongoose.model<IGameResult>('GameResult', GameResultSchema);
