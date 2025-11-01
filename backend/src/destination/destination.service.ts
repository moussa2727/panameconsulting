import { 
    Injectable, 
    NotFoundException, 
    ConflictException,
    Logger 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StorageService } from '../shared/storage/storage.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { Destination } from './entities/destination.entity';

const defaultDestinations = [
    {
        country: 'Russie',
        imagePath: '/russie.png',
        text: 'La Russie propose un enseignement supérieur d\'excellence avec des universités historiques comme MGU. Système éducatif combinant tradition et recherche de pointe dans un environnement multiculturel.'
    },
    {
        country: 'Chine',
        imagePath: '/chine.jpg',
        text: 'La Chine développe des pôles universitaires high-tech avec des programmes innovants en IA et commerce international. Universités comme Tsinghua rivalisent avec les meilleures mondiales.'
    },
    {
        country: 'Maroc',
        imagePath: '/maroc.webp',
        text: 'Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d\'échange avec l\'Europe.'
    },
    {
        country: 'Algérie',
        imagePath: '/algerie.png',
        text: 'L\'Algérie dispose d\'universités performantes en sciences et médecine avec des coûts très abordables. Système éducatif francophone et infrastructures récentes.'
    },
    {
        country: 'Turquie',
        imagePath: '/turquie.webp',
        text: 'La Turquie combine éducation de qualité et frais modestes avec des universités accréditées internationalement. Position géographique unique entre Europe et Asie.'
    },
    {
        country: 'France',
        imagePath: '/france.svg',
        text: 'La France maintient sa tradition d\'excellence académique avec des universités historiques et grandes écoles renommées. Système éducatif diversifié offrant des formations pointues.'
    }
];

@Injectable()
export class DestinationService {
    private readonly logger = new Logger(DestinationService.name);

    constructor(
        @InjectModel(Destination.name)
        private readonly destinationModel: Model<Destination>,
        private readonly storageService: StorageService,
    ) {
        this.initializeDefaultDestinations();
    }

    private async initializeDefaultDestinations(): Promise<void> {
        try {
            const count = await this.destinationModel.countDocuments();
            if (count === 0) {
                await this.destinationModel.insertMany(defaultDestinations);
                this.logger.log('Destinations par défaut insérées');
            }
        } catch (error) {
            this.logger.error('Erreur lors de l\'initialisation des destinations:', error);
        }
    }

    async create(
        createDestinationDto: CreateDestinationDto,
        imageFile: Express.Multer.File,
    ): Promise<Destination> {
        // Vérifier si la destination existe déjà
        const existing = await this.destinationModel.findOne({ 
            country: createDestinationDto.country 
        });
        if (existing) {
            throw new ConflictException('Cette destination existe déjà');
        }

        try {
            const fileName = await this.storageService.uploadFile(imageFile);
            const imagePath = `uploads/${fileName}`;

            const createdDestination = new this.destinationModel({
                ...createDestinationDto,
                imagePath,
            });

            return await createdDestination.save();
        } catch (error) {
            this.logger.error(`Erreur création destination: ${error.message}`);
            throw error;
        }
    }

    async findAll(
        page: number = 1,
        limit: number = 10,
        search?: string
    ): Promise<{ data: Destination[]; total: number; page: number; limit: number; totalPages: number }> {
        const skip = (page - 1) * limit;
        
        const filters: any = {};
        if (search) {
            filters.country = { $regex: search, $options: 'i' };
        }

        const [data, total] = await Promise.all([
            this.destinationModel.find(filters)
                .skip(skip)
                .limit(limit)
                .sort({ country: 1 })
                .exec(),
            this.destinationModel.countDocuments(filters)
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findAllWithoutPagination(): Promise<Destination[]> {
        return this.destinationModel.find()
            .sort({ country: 1 })
            .exec();
    }

    async findOne(id: string): Promise<Destination> {
        const destination = await this.destinationModel.findById(id).exec();
        if (!destination) {
            throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
        }
        return destination;
    }

    async findByCountry(country: string): Promise<Destination | null> {
        return this.destinationModel.findOne({ country }).exec();
    }

    async update(
        id: string,
        updateDestinationDto: UpdateDestinationDto,
        imageFile?: Express.Multer.File,
    ): Promise<Destination> {
        const destination = await this.findOne(id);

        // Vérifier si le nouveau pays existe déjà (sauf pour la destination actuelle)
        if (updateDestinationDto.country && updateDestinationDto.country !== destination.country) {
            const existing = await this.destinationModel.findOne({ 
                country: updateDestinationDto.country,
                _id: { $ne: id }
            });
            if (existing) {
                throw new ConflictException('Cette destination existe déjà');
            }
        }

        let imagePath = destination.imagePath;
        if (imageFile) {
            // Supprimer l'ancienne image si elle existe
            if (destination.imagePath) {
                await this.storageService.deleteFile(destination.imagePath);
            }
            
            const fileName = await this.storageService.uploadFile(imageFile);
            imagePath = `uploads/${fileName}`;
        }

        const updatedDestination = await this.destinationModel
            .findByIdAndUpdate(
                id,
                {
                    ...updateDestinationDto,
                    ...(imageFile && { imagePath })
                },
                { new: true, runValidators: true }
            )
            .exec();

        if (!updatedDestination) {
            throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
        }

        return updatedDestination;
    }

    async remove(id: string): Promise<void> {
        const destination = await this.destinationModel.findById(id).exec();
        if (!destination) {
            throw new NotFoundException(`Destination avec ID ${id} non trouvée`);
        }

        // Supprimer l'image associée
        if (destination.imagePath) {
            await this.storageService.deleteFile(destination.imagePath);
        }

        await this.destinationModel.deleteOne({ _id: id }).exec();
        this.logger.log(`Destination supprimée: ${id}`);
    }

    async count(): Promise<number> {
        return this.destinationModel.countDocuments().exec();
    }
}