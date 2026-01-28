const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const connectDB = async () => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supergame';
            await mongoose.connect(mongoURI);
            console.log('MongoDB Connected...');
            return;
        } catch (err) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, err.message);
            if (retries === MAX_RETRIES) {
                console.error('Failed to connect to MongoDB after multiple attempts');
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
};

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // include other fields loosely to avoid validation errors if schema drifts
}, { strict: false });

const User = mongoose.model('User', userSchema);

const promoteUser = async () => {
    const username = process.argv[2];

    if (!username) {
        console.log('Usage: node make_admin.js <username>');
        process.exit(1);
    }

    try {
        await connectDB();

        const user = await User.findOne({ username });

        if (!user) {
            console.error(`User "${username}" not found.`);
            process.exit(1);
        }

        if (user.role === 'admin') {
            console.log(`User "${username}" is already an admin.`);
            process.exit(0);
        }

        user.role = 'admin';
        await user.save();

        console.log(`Success! User "${username}" has been promoted to ADMIN.`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

promoteUser();
