import mongoose, { type HydratedDocument } from 'mongoose';
import type { UserStatus } from '@ai-job-hunter/shared';

const { Schema, model, models } = mongoose;

export interface UserDocument { email: string; displayName?: string; status: UserStatus; }
export type UserHydratedDocument = HydratedDocument<UserDocument>;

const userSchema = new Schema<UserDocument>({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  displayName: { type: String, trim: true },
  status: { type: String, enum: ['active', 'disabled'], default: 'active', required: true },
}, { timestamps: true });

export const UserModel = models.User || model<UserDocument>('User', userSchema);
