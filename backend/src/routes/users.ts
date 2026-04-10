import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatarUrl: true,
        shotsRemaining: true,
        deletesRemaining: true,
        shotsResetAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Update current user profile
router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, bio, avatarUrl } = req.body;
    
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatarUrl: true,
        shotsRemaining: true,
        deletesRemaining: true,
        shotsResetAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Upload avatar
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required', code: 'VALIDATION_ERROR' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatarUrl: true,
        shotsRemaining: true,
        deletesRemaining: true,
        shotsResetAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID', code: 'VALIDATION_ERROR' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Search users by username
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required', code: 'VALIDATION_ERROR' });
    }
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true
      },
      take: 20
    });
    
    res.json({
      data: users,
      total: users.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

export default router;