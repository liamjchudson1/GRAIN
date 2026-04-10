import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
const prisma = new PrismaClient();

// Create post
router.post('/', authMiddleware, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required', code: 'VALIDATION_ERROR' });
    }
    
    const { caption, location, latitude, longitude, isLate, lateMinutes } = req.body;
    
    // Check if user has shots remaining — also auto-reset if 7 days have passed
    let user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { shotsRemaining: true, shotsResetAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Auto-reset if reset window has passed
    const now = new Date();
    if (user.shotsResetAt <= now) {
      const nextReset = new Date(now);
      nextReset.setDate(nextReset.getDate() + 7);
      await prisma.user.update({
        where: { id: req.userId },
        data: { shotsRemaining: 12, deletesRemaining: 1, shotsResetAt: nextReset }
      });
      user = { ...user, shotsRemaining: 12 };
    }

    if (user.shotsRemaining <= 0) {
      return res.status(403).json({
        error: 'No shots remaining. Wait for weekly reset.',
        code: 'NO_SHOTS_REMAINING'
      });
    }
    
    // Create post
    const imageUrl = `/uploads/posts/${req.file.filename}`;
    
    const post = await prisma.post.create({
      data: {
        userId: req.userId!,
        caption,
        imageUrl,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isLate: isLate === 'true' || isLate === true,
        lateMinutes: lateMinutes ? parseInt(lateMinutes) : null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        reactions: true
      }
    });
    
    // Decrement shots remaining and record last posted time
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        shotsRemaining: { decrement: 1 },
        lastPostedAt: new Date(),
      }
    });
    
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Get feed (posts from friends)
router.get('/feed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Get accepted friends
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.userId, status: 'accepted' },
          { friendId: req.userId, status: 'accepted' }
        ]
      },
      select: {
        userId: true,
        friendId: true
      }
    });
    
    // Extract friend IDs
    const friendIds = friends.map(f => 
      f.userId === req.userId ? f.friendId : f.userId
    );
    
    // Include current user's posts too
    friendIds.push(req.userId!);
    
    // Get posts
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          userId: { in: friendIds }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.post.count({
        where: {
          userId: { in: friendIds }
        }
      })
    ]);
    
    res.json({
      data: posts,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Get user's posts
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID', code: 'VALIDATION_ERROR' });
    }
    
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.post.count({ where: { userId } })
    ]);
    
    res.json({
      data: posts,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Get single post
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID', code: 'VALIDATION_ERROR' });
    }
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true
              }
            }
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found', code: 'POST_NOT_FOUND' });
    }
    
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Delete post
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id as string);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID', code: 'VALIDATION_ERROR' });
    }
    
    // Check if post exists and belongs to user
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found', code: 'POST_NOT_FOUND' });
    }
    
    if (post.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post', code: 'FORBIDDEN' });
    }
    
    // Check if user has deletes remaining
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { deletesRemaining: true }
    });
    
    if (!user || user.deletesRemaining <= 0) {
      return res.status(403).json({ 
        error: 'No deletes remaining. Wait for weekly reset.', 
        code: 'NO_DELETES_REMAINING' 
      });
    }
    
    // Delete post
    await prisma.post.delete({
      where: { id: postId }
    });
    
    // Decrement deletes remaining
    await prisma.user.update({
      where: { id: req.userId },
      data: { deletesRemaining: { decrement: 1 } }
    });
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

export default router;