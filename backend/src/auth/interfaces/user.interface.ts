import { Document } from 'mongoose';
import { UserRole } from '../../schemas/user.schema';

export interface IUser extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  role: UserRole;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}