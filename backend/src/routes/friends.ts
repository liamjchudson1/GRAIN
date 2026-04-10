import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all friends (accepted)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.userId, status: 'accepted' },
          { friendId: req.userId, status: 'accepted' }
        ]
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
        friend: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        }
      }
    });
    
    // Map to return the friend (not current user)
    const friendsList = friends.map(f => {
      const friendUser = f.userId === req.userId ? f.friend : f.user;
      return {
        id: f.id,
        user: friendUser,
        createdAt: f.createdAt
      };
    });
    
    res.json({
      data: friendsList,
      total: friendsList.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Get pending friend requests (incoming)
router.get('/requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.friend.findMany({
      where: {
        friendId: req.userId,
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      data: requests,
      total: requests.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Send friend request
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required', code: 'VALIDATION_ERROR' });
    }
    
    // Can't add yourself
    if (friendId === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself as friend', code: 'VALIDATION_ERROR' });
    }
    
    // Check if friend exists
    const friendUser = await prisma.user.findUnique({
      where: { id: friendId }
    });
    
    if (!friendUser) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    
    // Check if friendship already exists
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId },
          { userId: friendId, friendId: req.userId }
        ]
      }
    });
    
    if (existingFriendship) {
      return res.status(400).json({ 
        error: 'Friend request already exists or you are already friends', 
        code: 'FRIENDSHIP_EXISTS' 
      });
    }
    
    // Create friend request
    const friendRequest = await prisma.friend.create({
      data: {
        userId: req.userId!,
        friendId,
        status: 'pending'
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        }
      }
    });
    
    res.status(201).json(friendRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Accept friend request
router.put('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const friendshipId = parseInt(req.params.id);
    
    if (isNaN(friendshipId)) {
      return res.status(400).json({ error: 'Invalid friendship ID', code: 'VALIDATION_ERROR' });
    }
    
    // Find the friendship request
    const friendship = await prisma.friend.findUnique({
      where: { id: friendshipId }
    });
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found', code: 'REQUEST_NOT_FOUND' });
    }
    
    // Check if current user is the recipient
    if (friendship.friendId !== req.userId) {
      return res.status(403).json({ 
        error: 'Not authorized to accept this request', 
        code: 'FORBIDDEN' 
      });
    }
    
    // Check if already accepted
    if (friendship.status === 'accepted') {
      return res.status(400).json({ error: 'Request already accepted', code: 'ALREADY_ACCEPTED' });
    }
    
    // Update status to accepted
    const updatedFriendship = await prisma.friend.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true
          }
        }
      }
    });
    
    res.json(updatedFriendship);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Reject friend request
router.put('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const friendshipId = parseInt(req.params.id);
    
    if (isNaN(friendshipId)) {
      return res.status(400).json({ error: 'Invalid friendship ID', code: 'VALIDATION_ERROR' });
    }
    
    // Find the friendship request
    const friendship = await prisma.friend.findUnique({
      where: { id: friendshipId }
    });
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found', code: 'REQUEST_NOT_FOUND' });
    }
    
    // Check if current user is the recipient
    if (friendship.friendId !== req.userId) {
      return res.status(403).json({ 
        error: 'Not authorized to reject this request', 
        code: 'FORBIDDEN' 
      });
    }
    
    // Update status to rejected (or delete it)
    await prisma.friend.update({
      where: { id: friendshipId },
      data: { status: 'rejected' }
    });
    
    res.json({ message: 'Friend request rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Remove friend
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const friendshipId = parseInt(req.params.id);
    
    if (isNaN(friendshipId)) {
      return res.status(400).json({ error: 'Invalid friendship ID', code: 'VALIDATION_ERROR' });
    }
    
    // Find the friendship
    const friendship = await prisma.friend.findUnique({
      where: { id: friendshipId }
    });
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found', code: 'FRIENDSHIP_NOT_FOUND' });
    }
    
    // Check if current user is part of the friendship
    if (friendship.userId !== req.userId && friendship.friendId !== req.userId) {
      return res.status(403).json({ 
        error: 'Not authorized to remove this friendship', 
        code: 'FORBIDDEN' 
      });
    }
    
    // Delete the friendship
    await prisma.friend.delete({
      where: { id: friendshipId }
    });
    
    res.json({ message: 'Friend removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

export default router;