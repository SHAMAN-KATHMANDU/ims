import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import memberController from "@/modules/members/member.controller";
import { uploadSingle } from "@/config/multer.config";

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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  memberController.createMember,
);

/**
 * @swagger
 * /members/bulk-upload/template:
 *   get:
 *     summary: Download bulk upload template (Excel with headers)
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
memberRouter.get(
  "/bulk-upload/template",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  memberController.downloadBulkUploadTemplate,
);

/**
 * @swagger
 * /members/bulk-upload:
 *   post:
 *     summary: Bulk upload members from Excel file
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Excel file (.xlsx, .xls, .xlsm) with columns: Phone number (required), SN, ID, Name, Address, DoB, Notes, Member since"
 *     responses:
 *       200:
 *         description: Bulk upload completed
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
memberRouter.post(
  "/bulk-upload",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  uploadSingle,
  memberController.bulkUploadMembers,
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
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 */
memberRouter.get(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  memberController.getAllMembers,
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
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  memberController.checkMember,
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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  memberController.getMemberByPhone,
);

/**
 * @swagger
 * /members/download:
 *   get:
 *     summary: Download members as Excel or CSV
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, csv]
 *           default: excel
 *         description: Export format (excel or csv)
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         description: Comma-separated list of member IDs to export. If not provided, exports all members.
 *         example: "id1,id2,id3"
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid format
 *       404:
 *         description: No members found
 */
memberRouter.get(
  "/download",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  memberController.downloadMembers,
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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  memberController.getMemberById,
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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  memberController.updateMember,
);

export default memberRouter;
