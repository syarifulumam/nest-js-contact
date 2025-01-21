import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  LoginUserRequest,
  RegisterUserRequest,
  UserResponse,
} from 'src/model/user.model';
import { Logger } from 'winston';
import { UserValidation } from './user.validation';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { User } from '@prisma/client';
@Injectable()
export class UserService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async register(request: RegisterUserRequest): Promise<UserResponse> {
    this.logger.info(`Register new user ${JSON.stringify(request)}`);

    const registerUserRequest: RegisterUserRequest =
      this.validationService.validate(UserValidation.REGISTER, request);

    const totalUser = await this.prismaService.user.count({
      where: {
        username: registerUserRequest.username,
      },
    });

    if (totalUser > 0) {
      throw new HttpException('Username already exist', 400);
    }

    registerUserRequest.password = await bcrypt.hash(
      registerUserRequest.password,
      10,
    );

    const user = await this.prismaService.user.create({
      data: registerUserRequest,
    });

    return {
      username: user.username,
      name: user.name,
    };
  }

  async login(request: LoginUserRequest): Promise<UserResponse> {
    this.logger.info(`UserSerice.login ${JSON.stringify(request)}`);

    const loginRequest: LoginUserRequest = this.validationService.validate(
      UserValidation.LOGIN,
      request,
    );

    let user = await this.prismaService.user.findUnique({
      where: {
        username: loginRequest.username,
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(
      loginRequest.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new HttpException('Password is incorrect', 404);
    }

    user = await this.prismaService.user.update({
      where: {
        username: loginRequest.username,
      },
      data: {
        token: uuid(),
      },
    });

    return {
      username: user.username,
      name: user.name,
      token: user.token,
    };
  }

  async get(user: User): Promise<UserResponse> {
    return {
      username: user.username,
      name: user.name,
    };
  }
}
