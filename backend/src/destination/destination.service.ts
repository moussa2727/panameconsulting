import { Injectable, NotFoundException } from '@nestjs/common';
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
    text: 'La Russie propose un enseignement supérieur d\'excellence avec des universités historiques comme MGU. Système éducatif combinant tradition et recherche de pointe dans un environnement multiculturel. Coûts de scolarité très compétitifs et bourses disponibles pour étudiants internationaux. Logements universitaires abordables et infrastructures modernes.'
  },
  {
    country: 'Chine',
    imagePath: '/chine.jpg',
    text: 'La Chine développe des pôles universitaires high-tech avec des programmes innovants en IA et commerce international. Universités comme Tsinghua rivalisent avec les meilleures mondiales. Environnement dynamique combinant technologie et culture millénaire. Cours en anglais disponibles avec des partenariats industriels solides pour les stages.'
  },
  {
    country: 'Maroc',
    imagePath: '/maroc.webp',
    text: 'Le Maroc offre un enseignement de qualité en français/arabe avec des frais accessibles. Universités reconnues en Afrique et programmes d\'échange avec l\'Europe. Environnement sécurisé et cadre de vie agréable. Spécialisations en ingénierie, médecine et commerce avec des liens forts vers le marché africain suivez des parcours axés sur le professionnelisme.'
  },
  {
    country: 'Algérie',
    imagePath: '/algerie.png',
    text: 'L\'Algérie dispose d\'universités performantes en sciences et médecine avec des coûts très abordables. Système éducatif francophone et infrastructures récentes. Opportunités de recherche dans les énergies renouvelables et la pharmacologie. Vie étudiante riche et logements universitaires subventionnés  / abordables.'
  },
  {
    country: 'Turquie',
    imagePath: '/turquie.webp',
    text: 'La Turquie combine éducation de qualité et frais modestes avec des universités accréditées internationalement. Position géographique unique entre Europe et Asie. Programmes en anglais disponibles avec spécialisation en ingénierie et relations internationales. Cadre de vie moderne préservant un riche héritage culturel.'
  },
  {
    country: 'France',
    imagePath: '/france.svg',
    text: 'La France maintient sa tradition d\'excellence académique avec des universités historiques et grandes écoles renommées. Système éducatif diversifié offrant des formations pointues dans tous les domaines. Réseau d\'anciens élèves influents et forte employabilité internationale. Vie culturelle riche et nombreuses bourses disponibles.'
  }
];
@Injectable()
export class DestinationService {
  constructor(
    @InjectModel(Destination.name)
    private readonly destinationModel: Model<Destination>,
    private readonly storageService: StorageService,
  ) {
        this.initializeDefaultDestinations();
  }


   private async initializeDefaultDestinations() {
    try {
      const count = await this.destinationModel.countDocuments();
      if (count === 0) {
        await this.destinationModel.insertMany(defaultDestinations);
        console.log('Default destinations inserted');
      }
    } catch (error) {
      console.error('Error initializing default destinations:', error);
    }
  }

  async create(
    createDestinationDto: CreateDestinationDto,
    imageFile: Express.Multer.File,
  ): Promise<Destination> {
    try {
      const fileName = await this.storageService.uploadFile(imageFile);
      const imagePath = `uploads/${fileName}`;

      const createdDestination = new this.destinationModel({
        ...createDestinationDto,
        imagePath,
      });

      return await createdDestination.save();
    } catch (error) {
      console.error('Error creating destination:', error);
      throw new Error(`Failed to create destination: ${error.message}`);
    }
  }

  async findAll(options: {
    page: number;
    limit: number;
    filters?: { country?: string };
  }): Promise<Destination[]> {
    const { page, limit, filters = {} } = options;
    const query = this.destinationModel.find(filters);
    return query
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async count(filters?: { country?: string }): Promise<number> {
    return this.destinationModel.countDocuments(filters || {}).exec();
  }

  async findOne(id: string): Promise<Destination> {
    const destination = await this.destinationModel.findById(id).exec();
    if (!destination) {
      throw new NotFoundException(`Destination with ID ${id} not found`);
    }
    return destination;
  }

  async update(
    id: string,
    updateDestinationDto: UpdateDestinationDto,
    imageFile?: Express.Multer.File,
  ): Promise<Destination> {
    const destination = await this.findOne(id);

    let imagePath = destination.imagePath;
    if (imageFile) {
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
          imagePath,
        },
        { new: true }
      )
      .exec();

    if (!updatedDestination) {
      throw new NotFoundException(`Destination with ID ${id} not found`);
    }

    return updatedDestination;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Invalid ID: ${id}`);
    }

    const destination = await this.destinationModel.findById(id).exec();
    if (!destination) {
      throw new NotFoundException(`Destination with ID ${id} not found`);
    }

    if (destination.imagePath) {
      await this.storageService.deleteFile(destination.imagePath);
    }

    await this.destinationModel.deleteOne({ _id: id }).exec();

    return { message: 'Destination deleted successfully' };
  }


async getPaginatedDestinations(page: number, limit: number) {
  return {
    data: await this.destinationModel.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .select('country imagePath') // Projection
      .lean(),
    total: await this.destinationModel.countDocuments()
  };
}

}