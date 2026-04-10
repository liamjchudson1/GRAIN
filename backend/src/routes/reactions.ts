import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Add or update reaction
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { postId, emoji } = req.body;
    
    if (!postId || !emoji) {
      return res.status(400).json({ 
        error: 'Post ID and emoji are required', 
        code: 'VALIDATION_ERROR' 
      });
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found', code: 'POST_NOT_FOUND' });
    }
    
    // Upsert reaction (create or update)
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_postId: {
          userId: req.userId!,
          postId
        }
      },
      update: {
        emoji
      },
      create: {
        userId: req.userId!,
        postId,
        emoji
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });
    
    // Get all reactions for this post
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });
    
    res.json({
      reaction,
      allReactions: reactions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Remove reaction
router.delete('/:postId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.postId as string);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID', code: 'VALIDATION_ERROR' });
    }
    
    // Check if reaction exists
    const reaction = await prisma.reaction.findUnique({
      where: {
        userId_postId: {
          userId: req.userId!,
          postId
        }
      }
    });
    
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found', code: 'REACTION_NOT_FOUND' });
    }
    
    // Delete reaction
    await prisma.reaction.delete({
      where: {
        userId_postId: {
          userId: req.userId!,
          postId
        }
      }
    });
    
    res.json({ message: 'Reaction removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Get reactions for a post
router.get('/:postId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.postId as string);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID', code: 'VALIDATION_ERROR' });
    }
    
    // Get all reactions
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });
    
    // Group by emoji with counts
    const grouped: { [key: string]: any } = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          users: []
        };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user);
    });
    
    // Check if current user has reacted
    const userReaction = reactions.find(r => r.userId === req.userId);
    
    res.json({
      reactions: Object.values(grouped),
      userReaction: userReaction ? {
        emoji: userReaction.emoji,
        reactionId: userReaction.id
      } : null,
      total: reactions.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

export default router;