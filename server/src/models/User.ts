import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password?: string;
    preferences: {
        theme: string;
    };
    role: 'user' | 'admin';
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
    }
});

export default mongoose.model<IUser>('User', UserSchema);
