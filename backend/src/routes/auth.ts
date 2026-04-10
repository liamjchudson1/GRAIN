import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, fullName } = req.body;
    
    // Validation
    if (!email || !username || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Email, username, password, and full name are required', 
        code: 'VALIDATION_ERROR' 
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists', 
        code: 'USER_EXISTS' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Calculate initial reset date (7 days from now)
    const shotsResetAt = new Date();
    shotsResetAt.setDate(shotsResetAt.getDate() + 7);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullName,
        shotsResetAt
      }
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      user: userWithoutPassword,
      token
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required', 
        code: 'VALIDATION_ERROR' 
      });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password', 
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password', 
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SERVER_ERROR' });
  }
});

export default router;