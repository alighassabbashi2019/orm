import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { query } from 'express';
import { RefTypeEnum } from 'src/enums/ref-type.enum';
import { EventEntity, EventTypes } from 'src/event/entities/event.entity';
import {
  Connection,
  QueryRunnerAlreadyReleasedError,
  Repository,
} from 'typeorm';
import { PaginationDto } from './dto/pagination.dto';
import { CreatePostDto } from './dtos/create-post.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { CategoryEntity } from './entities/category.entity';
import { PostEntity } from './entities/post.entity';

@Injectable()
export class PostService {
  constructor(
    @Inject('MAIL_API')
    private readonly mailApi: string,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly connection: Connection,
  ) {
    console.log(`PostService: constructor, mail api is: ${mailApi}`);
  }

  findAll(pagination?: PaginationDto) {
    return this.postRepository.find({
      relations: ['categories'],
      skip: pagination.page * pagination.pageCount,
      take: pagination.pageCount,
    });
  }

  findOne(id: number) {
    return this.postRepository.findOne(id, {
      relations: ['categories'],
    });
  }

  async preloadCategory(_item: string) {
    const category = await this.categoryRepository.findOne({
      where: {
        name: _item,
      },
    });
    console.log(category);
    if (category) {
      return category;
    } else {
      return this.categoryRepository.create({ name: _item });
    }
  }

  async create(body: CreatePostDto) {
    const categories = await Promise.all(
      body.categories.map((_item) => {
        return this.preloadCategory(_item);
      }),
    );
    console.log(categories);
    const post = this.postRepository.create({
      ...body,
      categories,
    });
    return this.postRepository.save(post);
  }

  async update(id: number, body: UpdatePostDto) {
    const categories = await Promise.all(
      body.categories.map((_item) => {
        return this.preloadCategory(_item);
      }),
    );
    const post = await this.postRepository.preload({
      id: id,
      ...body,
      categories,
    });
    if (!post) {
      throw new NotFoundException(`post with id ${id} not found`);
    }
    return this.postRepository.save(post);
  }

  async delete(id: number) {
    const post = await this.findOne(id);
    this.postRepository.remove(post);

    return post;
  }

  async event(id: number, type: EventTypes) {
    const queryRunner = this.connection.createQueryRunner();
    let post = await this.findOne(id);
    console.log('post', post);
    if (type == EventTypes.Liked) {
      console.log(post.likeCount);
      post.likeCount++;
      console.log(post.likeCount);
    }
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      console.log(post);
      post = await queryRunner.manager.save(post);
      const event = this.eventRepository.create({
        message: type,
        refId: post.id,
        refType: RefTypeEnum.Post,
      });
      await queryRunner.manager.save(event);
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

    return post;
  }
}
