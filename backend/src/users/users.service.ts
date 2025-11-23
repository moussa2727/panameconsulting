import { 
  BadRequestException, 
  Injectable, 
  Logger, 
  NotFoundException, 
  UnauthorizedException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
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
    if (!input) return undefined;
    
    const trimmed = input.trim();
    if (trimmed === '') return undefined;
    
    // ✅ Extraire uniquement les chiffres SANS indicatif par défaut
    const digitsOnly = trimmed.replace(/\D/g, '');
    
    // Validation minimale : au moins 5 chiffres
    if (digitsOnly.length < 5) {
      return undefined;
    }
    
    return digitsOnly; // ✅ Retourne uniquement les chiffres sans formatage
  }

   
  async validateUser(email: string, password: string): Promise<User | null> {
      const user = await this.findByEmail(email);
      if (user && await bcrypt.compare(password, user.password)) {
          return user;
      }
      return null;
  }

  async exists(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    return !!user;
  }

    async findByEmail(email: string): Promise<User | null> {
      return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
    }

    async findByRole(role: UserRole): Promise<User | null> {
      return this.userModel.findOne({ role }).exec();
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


 async create(createUserDto: RegisterDto): Promise<User> {
  try {
    // ✅ Vérifier seulement l'email (garder email unique)
    const existingUserWithEmail = await this.findByEmail(createUserDto.email);
    if (existingUserWithEmail) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, AuthConstants.BCRYPT_SALT_ROUNDS);
    
    // ✅ NORMALISATION DU TÉLÉPHONE (chiffres uniquement)
    const normalizedTelephone = this.normalizeTelephone(createUserDto.telephone);
    
    const userData: any = {
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email.toLowerCase().trim(),
      password: hashedPassword,
      isActive: true,
    };

    // ✅ Ajouter le téléphone seulement s'il est valide
    if (normalizedTelephone) {
      userData.telephone = normalizedTelephone;
    } else {
      // Si le téléphone est requis, lancer une exception
      throw new BadRequestException('Le numéro de téléphone est invalide');
    }

    const user = new this.userModel(userData);
    return await user.save();
    
  } catch (error: any) {
    // ✅ Gestion des erreurs MongoDB
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'email') {
        throw new BadRequestException('Cet email est déjà utilisé');
      }
    }
    
    // ✅ Propager les erreurs métier existantes
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    this.logger.error(`Erreur lors de la création utilisateur: ${error.message}`);
    throw new BadRequestException('Erreur lors de la création du compte');
  }
}

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    console.log('🔄 Mise à jour utilisateur.');
    
    // Validation de l'ID
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID utilisateur invalide');
    }

    // Filtrer et valider les données
    const filteredUpdate = this.filterAndValidateUpdateData(updateUserDto);
    
    try {
      // Vérifier l'existence de l'utilisateur
      await this.verifyUserExists(id);
      
      // Vérifier les conflits avant mise à jour
      await this.checkForConflicts(id, filteredUpdate);
      
      // Effectuer la mise à jour
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id, 
          filteredUpdate, 
          { 
            new: true, 
            runValidators: true,
            context: 'query'
          }
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('Utilisateur non trouvé après mise à jour');
      }

      console.log('✅ Utilisateur mis à jour avec succès');
      return updatedUser;

    } catch (error: any) {
      this.handleUpdateError(error);
    }
  }



  private filterAndValidateUpdateData(updateUserDto: UpdateUserDto): any {
    const allowedFields = ['email', 'telephone'];
    const filteredUpdate: any = {};
    
    Object.keys(updateUserDto).forEach(key => {
      if (allowedFields.includes(key) && updateUserDto[key as keyof UpdateUserDto] !== undefined) {
        const value = updateUserDto[key as keyof UpdateUserDto];
        if (value !== null && value !== '') {
          filteredUpdate[key] = value;
        }
      }
    });

    if (Object.keys(filteredUpdate).length === 0) {
      throw new BadRequestException('Aucune donnée valide à mettre à jour');
    }

    // Normalisation
    if (filteredUpdate.email) {
      filteredUpdate.email = filteredUpdate.email.toLowerCase().trim();
      this.validateEmail(filteredUpdate.email);
    }

    if (filteredUpdate.telephone) {
      filteredUpdate.telephone = this.normalizeTelephone(filteredUpdate.telephone);
      this.validateTelephone(filteredUpdate.telephone);
    }

    return filteredUpdate;
  }



  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Format d\'email invalide');
    }
  }



  private validateTelephone(telephone: string | undefined): void {
    if (telephone && telephone.length < 5) {
      throw new BadRequestException('Le téléphone doit contenir au moins 5 caractères');
    }
  }



  private async verifyUserExists(userId: string): Promise<void> {
    const existingUser = await this.userModel.findById(userId).exec();
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }



  private async checkForConflicts(userId: string, updateData: any): Promise<void> {
    if (updateData.email) {
      const existingUserWithEmail = await this.userModel.findOne({
        email: updateData.email,
        _id: { $ne: new Types.ObjectId(userId) }
      }).exec();

      if (existingUserWithEmail) {
        throw new BadRequestException('Cet email est déjà utilisé');
      }
    }

    if (updateData.telephone) {
      const existingUserWithPhone = await this.userModel.findOne({
        telephone: updateData.telephone,
        _id: { $ne: new Types.ObjectId(userId) }
      }).exec();

      if (existingUserWithPhone) {
        throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
      }
    }
  }



  private handleUpdateError(error: any): never {
    console.error('❌ Erreur mise à jour utilisateur:', error);
    
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
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      throw new BadRequestException(messages.join(', '));
    }
    
    if (error.name === 'CastError') {
      throw new BadRequestException('ID utilisateur invalide');
    }
    
    // Propager les erreurs métier existantes
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }
    
    this.logger.error(`Erreur inattendue: ${error.message}`, error.stack);
    throw new BadRequestException('Erreur lors de la mise à jour du profil');
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