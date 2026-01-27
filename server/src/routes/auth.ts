import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ msg: 'Please enter all fields' });

        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, username: user.username, preferences: user.preferences, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ msg: 'Please enter all fields' });

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: 'User not found' });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, username: user.username, preferences: user.preferences, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

router.post('/admin-session', auth, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        // Set a secure, httpOnly cookie for the admin session
        // In production, secure: true should be set if using HTTPS
        res.cookie('admin_token', req.header('x-auth-token'), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

export default router;
