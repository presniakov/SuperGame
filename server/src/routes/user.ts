
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
        const { theme, startSpeed } = req.body;

        const updateData: any = {};
        if (theme) updateData['preferences.theme'] = theme;
        if (startSpeed !== undefined) updateData['preferences.startSpeed'] = startSpeed;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No preferences provided to update' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
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

// ADMIN: Get all users
router.get('/all', auth, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        const users = await User.find().select('-password').sort({ date: -1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ADMIN: Update user role
router.patch('/:id/role', auth, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { role } },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ADMIN: Get specific user history
router.get('/:id/history', auth, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        const results = await GameResult.find({ userId: req.params.id })
            .select('date statistics eventLog')
            .sort({ date: -1 })
            .limit(50); // Last 50 games

        res.json(results);
    } catch (error) {
        console.error('Error fetching user history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
