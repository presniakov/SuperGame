import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password?: string;
    preferences: {
        theme: string;
    };
    role: 'user' | 'admin';
    statistics?: {
        lastSession: {
            startSpeed: number;
            maxSpeed: number;
            errorRateFirst23: number;
            errorRateLast13: number;
        };
        global: {
            maxSpeed: number;
        };
    };
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    preferences: {
        theme: { type: String, default: 'cyber' }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    statistics: {
        lastSession: {
            startSpeed: { type: Number, default: 0 },
            maxSpeed: { type: Number, default: 0 },
            errorRateFirst23: { type: Number, default: 0 },
            errorRateLast13: { type: Number, default: 0 }
        },
        global: {
            maxSpeed: { type: Number, default: 0 }
        }
    }
});

export default mongoose.model<IUser>('User', UserSchema);
