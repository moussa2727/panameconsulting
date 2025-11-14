import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseFilePipe,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    BadRequestException,
    NotFoundException,
    HttpStatus,
    Res,
    UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '../schemas/user.schema';
import { Roles } from '../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

// Interface pour la réponse paginée cohérente avec le frontend
interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@ApiTags('Destinations')
@Controller('destinations')
@UsePipes(new ValidationPipe({ 
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true 
}))
export class DestinationController {
    constructor(private readonly destinationService: DestinationService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('image'))
    @ApiOperation({ 
        summary: 'Créer une nouvelle destination',
        description: 'Endpoint réservé aux administrateurs pour créer une destination avec image'
    })
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Données de la destination avec image',
        type: CreateDestinationDto
    })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Destination créée avec succès' 
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Données invalides ou image manquante' 
    })
    @ApiResponse({ 
        status: HttpStatus.CONFLICT, 
        description: 'La destination existe déjà' 
    })
    @ApiResponse({ 
        status: HttpStatus.UNAUTHORIZED, 
        description: 'Token manquant ou invalide' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'Droits administrateur requis' 
    })
    async create(
        @Res() res: Response, // Déplacer @Res en premier
        @Body() createDestinationDto: CreateDestinationDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    // Validation cohérente avec le frontend
                    // new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    // new FileTypeValidator({ fileType: /image\/(jpeg|png|jpg|webp|svg\+xml)/ }),
                ],
                errorHttpStatusCode: HttpStatus.BAD_REQUEST,
            }),
        )
        imageFile: Express.Multer.File,
    ) {
        try {
            const destination = await this.destinationService.create(createDestinationDto, imageFile);
            
            return res.status(HttpStatus.CREATED).json({
                success: true,
                message: 'Destination créée avec succès',
                data: destination
            });
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw new BadRequestException({
                    success: false,
                    message: error.message,
                    error: 'VALIDATION_ERROR'
                });
            }
            throw error;
        }
    }

    @Get()
    @ApiOperation({ 
        summary: 'Récupérer la liste paginée des destinations',
        description: 'Endpoint public pour récupérer les destinations avec pagination et recherche'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Numéro de page (défaut: 1)',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Nombre d\'éléments par page (défaut: 10)',
        example: 10
    })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Terme de recherche par nom de pays',
        example: 'France'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Liste des destinations récupérée avec succès' 
    })
    async findAll(
        @Res() res: Response, // Déplacer @Res en premier
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
    ) {
        try {
            // Validation des paramètres de pagination
            const validPage = Math.max(1, parseInt(page as any) || 1);
            const validLimit = Math.min(Math.max(1, parseInt(limit as any) || 10), 100); // Max 100 items
            
            const result = await this.destinationService.findAll(validPage, validLimit, search);
            
            // Format de réponse cohérent avec le frontend
            const response: PaginatedResponse<any> = {
                data: result.data,
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages
            };

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Destinations récupérées avec succès',
                data: response.data,
                meta: {
                    total: response.total,
                    page: response.page,
                    limit: response.limit,
                    totalPages: response.totalPages
                }
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erreur lors de la récupération des destinations',
                error: 'INTERNAL_ERROR'
            });
        }
    }

    @Get('all')
    @ApiOperation({ 
        summary: 'Récupérer toutes les destinations (sans pagination)',
        description: 'Endpoint public pour récupérer toutes les destinations sans pagination - utile pour les selects'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Toutes les destinations récupérées avec succès' 
    })
    async findAllWithoutPagination(@Res() res: Response) {
        try {
            const destinations = await this.destinationService.findAllWithoutPagination();
            
            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Toutes les destinations récupérées avec succès',
                data: destinations,
                meta: {
                    count: destinations.length
                }
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erreur lors de la récupération des destinations',
                error: 'INTERNAL_ERROR'
            });
        }
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Récupérer une destination par ID',
        description: 'Endpoint public pour récupérer une destination spécifique'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Destination trouvée' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Destination non trouvée' 
    })
    async findOne(@Res() res: Response, @Param('id') id: string) {
        try {
            const destination = await this.destinationService.findOne(id);
            
            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Destination récupérée avec succès',
                data: destination
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: error.message,
                    error: 'NOT_FOUND'
                });
            }
            
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erreur lors de la récupération de la destination',
                error: 'INTERNAL_ERROR'
            });
        }
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('image'))
    @ApiOperation({ 
        summary: 'Mettre à jour une destination',
        description: 'Endpoint réservé aux administrateurs pour mettre à jour une destination'
    })
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({ 
        description: 'Données de mise à jour (partielles)',
        type: UpdateDestinationDto 
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Destination mise à jour avec succès' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Destination non trouvée' 
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Données invalides' 
    })
    async update(
        @Res() res: Response, // Déplacer @Res en premier
        @Param('id') id: string,
        @Body() updateDestinationDto: UpdateDestinationDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    // new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    // new FileTypeValidator({ fileType: /image\/(jpeg|png|jpg|webp|svg\+xml)/ }),
                ],
                fileIsRequired: false,
                errorHttpStatusCode: HttpStatus.BAD_REQUEST,
            }),
        )
        imageFile?: Express.Multer.File,
    ) {
        try {
            // Vérifier qu'au moins un champ est fourni (cohérent avec le frontend)
            if (Object.keys(updateDestinationDto).length === 0 && !imageFile) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Aucune donnée à mettre à jour fournie',
                    error: 'NO_DATA_PROVIDED'
                });
            }

            const updatedDestination = await this.destinationService.update(
                id, 
                updateDestinationDto, 
                imageFile
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Destination mise à jour avec succès',
                data: updatedDestination
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: error.message,
                    error: 'NOT_FOUND'
                });
            }
            
            if (error instanceof BadRequestException) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    error: 'VALIDATION_ERROR'
                });
            }
            
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erreur lors de la mise à jour de la destination',
                error: 'INTERNAL_ERROR'
            });
        }
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ 
        summary: 'Supprimer une destination',
        description: 'Endpoint réservé aux administrateurs pour supprimer une destination'
    })
    @ApiBearerAuth()
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Destination supprimée avec succès' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Destination non trouvée' 
    })
    @ApiResponse({ 
        status: HttpStatus.UNAUTHORIZED, 
        description: 'Token manquant ou invalide' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'Droits administrateur requis' 
    })
    async remove(@Res() res: Response, @Param('id') id: string) {
        try {
            await this.destinationService.remove(id);
            
            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Destination supprimée avec succès',
                data: null
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: error.message,
                    error: 'NOT_FOUND'
                });
            }
            
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erreur lors de la suppression de la destination',
                error: 'INTERNAL_ERROR'
            });
        }
    }

    // Endpoint supplémentaire pour la cohérence avec le frontend
    @Get('count/total')
    @ApiOperation({ 
        summary: 'Compter le nombre total de destinations',
        description: 'Endpoint public pour obtenir le nombre total de destinations'
    })
    async countTotal(@Res() res: Response) {
        try {
            const count = await this.destinationService.count();
            
            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Nombre de destinations récupéré avec succès',
                data: { count }
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erreur lors du comptage des destinations',
                error: 'INTERNAL_ERROR'
            });
        }
    }
}