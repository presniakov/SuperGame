
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

        // Get last played letters
        const lastGame = await GameResult.findOne({ userId: req.user.id })
            .sort({ date: -1 })
            .select('letters');

        const userData = user.toObject();
        (userData as any).lastPlayedLetters = lastGame?.letters || ['A', 'L'];

        res.json(userData);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user preferences
router.put('/preferences', auth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { theme, startSpeed, profile, forceSessionType } = req.body;

        const updateData: any = {};
        if (theme) updateData['preferences.theme'] = theme;
        if (startSpeed !== undefined) updateData['preferences.startSpeed'] = startSpeed;
        if (profile) updateData['preferences.profile'] = profile;
        if (forceSessionType !== undefined) updateData['preferences.forceSessionType'] = forceSessionType;

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

// ADMIN: Update specific user preferences
router.patch('/:id/preferences', auth, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        const userId = req.params.id;
        const { profile, forceSessionType } = req.body;

        if (!profile && !forceSessionType) {
            return res.status(400).json({ message: 'Profile or Session Type is required' });
        }

        const updateFields: any = {};
        if (profile) updateFields['preferences.profile'] = profile;
        if (forceSessionType !== undefined) updateFields['preferences.forceSessionType'] = forceSessionType;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating user preferences:', error);
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

// ADMIN: Delete User (Cascading)
router.delete('/:id', auth, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        const userId = req.params.id;

        // 1. Delete the User
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Cascading: Delete all GameResults for this user
        const deleteResult = await GameResult.deleteMany({ userId });

        console.log(`Admin deleted user ${deletedUser.username} (${userId}) and ${deleteResult.deletedCount} game records.`);

        res.json({
            message: `User ${deletedUser.username} deleted`,
            details: `Removed user and ${deleteResult.deletedCount} history records.`
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
