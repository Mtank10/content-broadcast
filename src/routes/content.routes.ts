import { Router } from 'express';
import { ContentController } from '../controllers/content.controller';
import {
  authenticate,
  authorize,
  validate,
  publicApiLimiter,
  uploadLimiter,
  cacheMiddleware,
  upload,
  handleUploadError,
} from '../middlewares/index';
import {
  UploadContentSchema,
  RejectContentSchema,
  ContentIdParamSchema,
  ContentFiltersSchema,
  LiveContentQuerySchema,
} from '../schemas/index';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: Content management and broadcasting
 */


/**
 * @swagger
 * /content/live/{teacherId}:
 *   get:
 *     summary: Get currently broadcasting content for a teacher (public, cached)
 *     tags: [Content]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the teacher
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Optional subject filter (maths, science, etc.)
 *     responses:
 *       200:
 *         description: Currently active content or No content available
 */
router.get(
  '/live/:teacherId',
  publicApiLimiter,
  validate(LiveContentQuerySchema),
  cacheMiddleware(parseInt(process.env.REDIS_CACHE_TTL_SECONDS ?? '60', 10)),
  ContentController.getLive
);

//  Teacher routes
/**
 * @swagger
 * /content/upload:
 *   post:
 *     summary: Upload content to Cloudinary (teacher only)
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, subject, file]
 *             properties:
 *               title:
 *                 type: string
 *               subject:
 *                 type: string
 *                 example: maths
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JPG, PNG or GIF — max 10MB
 *               description:
 *                 type: string
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               rotation_duration:
 *                 type: integer
 *                 description: Minutes this content is shown per cycle (default 5)
 *     responses:
 *       201:
 *         description: Content uploaded, pending approval
 */
router.post(
  '/upload',
  authenticate,
  authorize('teacher'),
  uploadLimiter,
  upload.single('file'),
  handleUploadError,
  validate(UploadContentSchema),
  ContentController.upload
);

/**
 * @swagger
 * /content/my:
 *   get:
 *     summary: Get teacher's own uploaded content (with filters and pagination)
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of teacher's content
 */
router.get(
  '/my',
  authenticate,
  authorize('teacher'),
  validate(ContentFiltersSchema),
  ContentController.getMyContent
);

/**
 * @swagger
 * /content/{id}:
 *   delete:
 *     summary: Delete own content and remove from Cloudinary (teacher only)
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Content deleted
 */
router.delete(
  '/:id',
  authenticate,
  authorize('teacher'),
  validate(ContentIdParamSchema),
  ContentController.deleteContent
);

//  Principal routes

/**
 * @swagger
 * /content/all:
 *   get:
 *     summary: Get all content with filters and pagination (principal only)
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by content status
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject (partial match)
 *       - in: query
 *         name: teacher_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by teacher
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated, filtered content list
 */
router.get(
  '/all',
  authenticate,
  authorize('principal'),
  validate(ContentFiltersSchema),
  ContentController.getAllContent
);

/**
 * @swagger
 * /content/{id}/approve:
 *   patch:
 *     summary: Approve pending content (principal only)
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Content approved and added to rotation
 */
router.patch(
  '/:id/approve',
  authenticate,
  authorize('principal'),
  validate(ContentIdParamSchema),
  ContentController.approve
);

/**
 * @swagger
 * /content/{id}/reject:
 *   patch:
 *     summary: Reject pending content with reason (principal only)
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Content rejected with reason stored
 */
router.patch(
  '/:id/reject',
  authenticate,
  authorize('principal'),
  validate(RejectContentSchema),
  ContentController.reject
);

// Utility 

/**
 * @swagger
 * /content/teachers:
 *   get:
 *     summary: List all registered teachers
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: Array of teacher objects
 */
router.get('/teachers', authenticate, ContentController.getTeachers);

export default router;
