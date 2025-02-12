import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './repositories/user.repository';
import { PostModule } from 'src/post/post.module';
import { PostService } from 'src/post/post.service';
import { PostRepository } from 'src/post/repositories/post.repository';
import { UtilsModule } from 'src/utils/utils.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { userConfig } from './config/user.config';


@Module({
  imports: [
    TypeOrmModule.forFeature([UserRepository]), 
    PostModule, 
    UtilsModule.register({ipUrl: 'https://ifconfig.ovh'}),
  ],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule { }
