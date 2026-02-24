import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import memberController from "@/modules/members/member.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const memberRouter = Router();

/**
 * @swagger
 * /members:
 *   post:
 *     summary: Create a new member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9841234567"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Member created successfully
 *       400:
 *         description: Phone number is required
 *       409:
 *         description: Member already exists
 */
memberRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(memberController.createMember),
);

/**
 * @swagger
 * /members:
 *   get:
 *     summary: Get all members with pagination
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by phone, name, or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name, id]
 *         description: Sort field. createdAt = date added.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (ascending or descending).
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 */
memberRouter.get(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(memberController.getAllMembers),
);

/**
 * @swagger
 * /members/check/{phone}:
 *   get:
 *     summary: Check if phone number is a member (for sales)
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns member status
 */
memberRouter.get(
  "/check/:phone",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(memberController.checkMember),
);

/**
 * @swagger
 * /members/phone/{phone}:
 *   get:
 *     summary: Get member by phone number
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member retrieved successfully
 *       404:
 *         description: Member not found
 */
memberRouter.get(
  "/phone/:phone",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(memberController.getMemberByPhone),
);

/**
 * @swagger
 * /members/{id}:
 *   get:
 *     summary: Get member by ID with purchase history
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member retrieved successfully
 *       404:
 *         description: Member not found
 */
memberRouter.get(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(memberController.getMemberById),
);

/**
 * @swagger
 * /members/{id}:
 *   put:
 *     summary: Update a member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               notes:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Member updated successfully
 *       404:
 *         description: Member not found
 */
memberRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(memberController.updateMember),
);

export default memberRouter;
