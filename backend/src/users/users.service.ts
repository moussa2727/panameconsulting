import { 
  BadRequestException, 
  Injectable, 
  Logger, 
  NotFoundException, 
  UnauthorizedException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdatePasswordDto } from '../auth/dto/update-password.dto';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { User, UserRole } from '../schemas/user.schema';
import { AuthConstants } from '../auth/auth.constants';

@Injectable()
export class UsersService {

  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  private normalizeTelephone(input?: string): string | undefined {
    if (!input) return input;
    const trimmed = input.trim();
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/[^\d]/g, '');
    return hasPlus ? `+${digits}` : digits;
  }


    async findOne(id: string): Promise<User | null> {
      return this.userModel.findById(id).exec();
    }

    async findAll(): Promise<User[]> {
      return this.userModel.find().exec();
    }

    async findById(id: string): Promise<User> {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }
      return user;
    }

    async checkUserAccess(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    if (!user.isActive) return false;
    if (user.logoutUntil && new Date() < user.logoutUntil) {
      return false;
    }
    return true;
  }

  async isMaintenanceMode(): Promise<boolean> {
  return process.env.MAINTENANCE_MODE === 'true';
}
  async setMaintenanceMode(enabled: boolean): Promise<void> {
    process.env.MAINTENANCE_MODE = enabled ? 'true' : 'false';
  }

  async logoutAll(): Promise<{ message: string, loggedOutCount: number }> {
    const activeUsers = await this.userModel.find({
      isActive: true,
      role: { $ne: UserRole.ADMIN } // Ne pas déconnecter les admins
    }).exec();

    const updatePromises = activeUsers.map(user => 
      this.userModel.findByIdAndUpdate(user._id, {
        isActive: false,
        logoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
    );

    await Promise.all(updatePromises);

    return {
      message: `${activeUsers.length} utilisateurs déconnectés`,
      loggedOutCount: activeUsers.length
    };
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByRole(role: UserRole): Promise<User | null> { // Utiliser UserRole
    return this.userModel.findOne({ role }).exec();
  }
  async exists(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    return !!user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

async create(createUserDto: RegisterDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('Un utilisateur avec cet email existe déjà');
    }

    const existingAdmin = await this.findByRole(UserRole.ADMIN);
    if (existingAdmin && createUserDto.role === UserRole.ADMIN) {
      throw new BadRequestException('Il ne peut y avoir qu\'un seul administrateur');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password, 
      AuthConstants.BCRYPT_SALT_ROUNDS
    );

    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: existingAdmin ? UserRole.USER : UserRole.ADMIN
    });

    // Normaliser le téléphone avant sauvegarde
    createdUser.telephone = this.normalizeTelephone(createdUser.telephone) as any;
    
    return createdUser.save();
  }


   async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Empêcher la modification du rôle via cet endpoint
    if (updateUserDto.role) {
      throw new BadRequestException('La modification du rôle n\'est pas autorisée');
    }

    // Normaliser le téléphone si présent
    if (updateUserDto.telephone) {
      updateUserDto.telephone = this.normalizeTelephone(updateUserDto.telephone);
    }

    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true, runValidators: true, context: 'query' })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      return updatedUser;
    } catch (error: any) {
      if (error?.code === 11000) {
        const fields = Object.keys(error.keyPattern || {});
        if (fields.includes('email')) {
          throw new BadRequestException('Cet email est déjà utilisé');
        }
        if (fields.includes('telephone')) {
          throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
        }
        throw new BadRequestException('Conflit de données');
      }
      throw error;
    }
  }
  
  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isMatch = await bcrypt.compare(updatePasswordDto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    user.password = await bcrypt.hash(
      updatePasswordDto.newPassword, 
      AuthConstants.BCRYPT_SALT_ROUNDS
    );
    
    await user.save();
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    user.password = await bcrypt.hash(
      newPassword, 
      AuthConstants.BCRYPT_SALT_ROUNDS
    );
    
    await user.save();
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }

  async toggleStatus(id: string): Promise<User> {
    const user = await this.findById(id);
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { isActive: !user.isActive },
        { new: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return updatedUser;
  }

 async checkDatabaseConnection(): Promise<boolean> {
  try {
    if (!this.userModel.db || !this.userModel.db.db) {
      return false;
    }
    await this.userModel.db.db.command({ ping: 1 });
    return true;
  } catch (error) {
    this.logger.error('Database connection check failed', error.stack);
    return false;
  }
}

  async getStats() {
    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel.countDocuments({ role: 'admin' }).exec(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers
    };
  }

  async getMaintenanceStatus() {
  return {
    isActive: await this.isMaintenanceMode(),
    logoutUntil: null // Retirer la date fixe
  };
}







}