import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  NotFoundException,
  Options,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../schemas/user.schema';
import { Roles } from '../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { PaginatedDestinationResponse } from './dto/paginated-destination-response.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { Destination } from './entities/destination.entity';

@ApiTags('Destinations')
@Controller('/destination')
export class DestinationController {
  constructor(
    private readonly destinationsService: DestinationService,
  ) { }

  @Options()
  @HttpCode(HttpStatus.NO_CONTENT)
  handleOptions() { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Créer une nouvelle destination' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Données de destination avec image',
    type: CreateDestinationDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Destination créée avec succè ',
    type: Destination,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async create(
    @Body() createDestinationDto: CreateDestinationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    imageFile: Express.Multer.File,
  ): Promise<Destination> {
    return this.destinationsService.create(createDestinationDto, imageFile);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of destinations' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre d\'éléments par page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    type: String,
    description: 'Filtrer selon le nom du pays',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of destinations',
    type: PaginatedDestinationResponse,
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('country') country?: string,
  ): Promise<PaginatedDestinationResponse> {
    const pageNum = Math.max(1, +page);
    const limitNum = Math.min(100, Math.max(1, +limit));

    const [data, total] = await Promise.all([
      this.destinationsService.findAll({
        page: pageNum,
        limit: limitNum,
        filters: country ? { country } : undefined,
      }),
      this.destinationsService.count(country ? { country } : undefined),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer la destination selon l\'ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Destination non disponible',
    type: Destination,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Destination non disponible',
  })
  async findOne(@Param('id') id: string): Promise<Destination> {
    return this.destinationsService.findOne(id);
  }

@Put(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(FileInterceptor('image'))
@ApiOperation({ summary: 'Mettre à jour une Destination' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'Données de mis à jour de la destination avec image optionnel',
  type: UpdateDestinationDto,
})
async update(
  @Param('id') id: string,
  @Body() updateDestinationDto: UpdateDestinationDto,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: 'image/*' }),
      ],
      fileIsRequired: false,
    }),
  )
  imageFile?: Express.Multer.File,
): Promise<Destination> {
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new NotFoundException('ID de destination invalide');
  }

  // Vérifier que au moins un champ est fourni pour la mise à jour
  if (Object.keys(updateDestinationDto).length === 0 && !imageFile) {
    throw new BadRequestException('Aucune donnée à mettre à jour fournie');
  }

  return this.destinationsService.update(id, updateDestinationDto, imageFile);
}

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer la destination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Destination Supprimée' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Destination non disponible' })
  async remove(@Param('id') id: string): Promise<void> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException('ID de destination invalide');
    }

    const destination = await this.destinationsService.findOne(id);
    await this.destinationsService.remove(id);
  }
}