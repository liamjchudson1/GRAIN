import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Weekly reset endpoint (to be called by cron job)
router.post('/reset-shots', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    // Find users who need reset
    const usersToReset = await prisma.user.findMany({
      where: {
        shotsResetAt: {
          lte: now
        }
      }
    });
    
    if (usersToReset.length === 0) {
      return res.json({ 
        message: 'No users need reset', 
        resetCount: 0 
      });
    }
    
    // Calculate next reset date (7 days from now)
    const nextResetAt = new Date();
    nextResetAt.setDate(nextResetAt.getDate() + 7);
    
    // Reset shots and deletes for all eligible users
    const result = await prisma.user.updateMany({
      where: {
        shotsResetAt: {
          lte: now
        }
      },
      data: {
        shotsRemaining: 12,
        deletesRemaining: 1,
        shotsResetAt: nextResetAt
      }
    });
    
    res.json({
      message: 'Weekly reset completed successfully',
      resetCount: result.count,
      nextResetAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

export default router;