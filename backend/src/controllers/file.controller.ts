import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env';
import { Attachment } from '../models/Attachment';
import { Lead } from '../models/Lead';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { AppError } from '../utils/AppError';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ENTITY_MODELS = { Project, Lead, Task } as const;
type EntityType = keyof typeof ENTITY_MODELS;

const listQuerySchema = z.object({
  entityType: z.enum(['Project', 'Lead', 'Task']),
  entityId: z.string().min(1),
});

// --- multer: local disk storage (swap for S3/Cloudinary in production) -----
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('file');

/** Verify the target entity exists inside the active org before attaching to it. */
async function assertEntityInOrg(orgId: string, type: EntityType, id: string) {
  const exists = await ENTITY_MODELS[type].exists({ _id: id, organization: orgId });
  if (!exists) throw AppError.badRequest('Target does not belong to this organization');
}

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest('No file provided');
  const parsed = listQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    fs.unlink(req.file.path, () => undefined); // clean up the orphaned upload
    throw AppError.badRequest('entityType and entityId are required');
  }
  const { entityType, entityId } = parsed.data;
  await assertEntityInOrg(req.orgId!, entityType, entityId);

  const attachment = await Attachment.create({
    organization: req.orgId,
    entityType,
    entityId,
    uploadedBy: req.userId,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `${env.apiUrl}/uploads/${req.file.filename}`,
  });

  res.status(201).json(attachment);
}

export async function listFiles(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw AppError.badRequest('entityType and entityId are required');
  const files = await Attachment.find({
    organization: req.orgId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  res.json(files);
}

export async function deleteFile(req: Request, res: Response) {
  const file = await Attachment.findOne({ _id: req.params.id, organization: req.orgId });
  if (!file) throw AppError.notFound('File not found');
  await file.deleteOne();
  fs.unlink(path.join(UPLOAD_DIR, file.storedName), () => undefined); // best-effort
  res.status(204).end();
}
