import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import postsRoutes from './posts';
import friendsRoutes from './friends';
import reactionsRoutes from './reactions';
import internalRoutes from './internal';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/posts', postsRoutes);
router.use('/friends', friendsRoutes);
router.use('/reactions', reactionsRoutes);
router.use('/internal', internalRoutes);

export default router;