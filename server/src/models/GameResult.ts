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
    maxSpeed: number;
    statistics?: {
        startSpeed: number;
        maxSpeed: number;
        errorRateFirst23: number;
        errorRateLast13: number;
    };
    eventLog: IGameEvent[];
}

const GameResultSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Can be null for guest?
    date: { type: Date, default: Date.now },
    maxSpeed: { type: Number, default: 0 },
    statistics: {
        startSpeed: Number,
        maxSpeed: Number, // Redundant but good for quick access? Or remove top level? Keeping top level for back-compat/ease.
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
