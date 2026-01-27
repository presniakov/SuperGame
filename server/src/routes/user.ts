
import express from 'express';
import User, { IUser } from '../models/User';
import GameResult from '../models/GameResult';
import { auth } from '../middleware/auth'; // We'll need to export a REST-compatible auth middleware or reuse the socket one? Ideally separate.

const router = express.Router();

// Get current user profile
router.get('/me', auth, async (req: any, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user preferences
router.put('/preferences', auth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { theme } = req.body;

        if (!theme) {
            return res.status(400).json({ message: 'Theme is required' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { 'preferences.theme': theme } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Preferences updated', preferences: user.preferences });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user game history
router.get('/history', auth, async (req: any, res) => {
    try {
        const results = await GameResult.find({ userId: req.user.id })
            .sort({ date: -1 })
            .limit(50); // Limit to last 50 games for now
        res.json(results);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
