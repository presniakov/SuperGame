import mongoose, { Schema, Document } from 'mongoose';
import { ProfileType } from '../games/GameProfiles';

export interface IUser extends Document {
    username: string;
    password?: string;
    preferences: {
        theme: { type: String, default: 'cyber' },
        startSpeed?: number;
        profile: ProfileType;
    };
    role: 'user' | 'admin';
    statistics?: {
        global: {
            maxSpeed: number;
        };
    };
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    preferences: {
        theme: { type: String, default: 'cyber' },
        startSpeed: { type: Number, default: 40 },
        profile: {
            type: String,
            enum: Object.values(ProfileType),
            default: ProfileType.CASUAL
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    statistics: {
        global: {
            maxSpeed: { type: Number, default: 0 }
        }
    }
});

export default mongoose.model<IUser>('User', UserSchema);
