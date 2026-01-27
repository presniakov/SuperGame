import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password?: string;
    preferences: {
        theme: string;
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
        theme: { type: String, default: 'cyber' }
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
