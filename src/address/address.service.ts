import { HttpException, Inject, Injectable } from '@nestjs/common';
import { Address, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  AddressResponse,
  CreateAddressRequest,
  GetAddressRequest,
  UpdateAddressRequest,
} from 'src/model/address.model';
import { Logger } from 'winston';
import { AddressValidation } from './address.validation';
import { ContactService } from 'src/contact/contact.service';

@Injectable()
export class AddressService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private contactService: ContactService,
  ) {}

  async create(
    user: User,
    request: CreateAddressRequest,
  ): Promise<AddressResponse> {
    this.logger.debug(
      `AddressService.create ${JSON.stringify(user)}, ${JSON.stringify(request)}`,
    );
    const createRequest: CreateAddressRequest = this.validationService.validate(
      AddressValidation.CREATE,
      request,
    );

    await this.contactService.checkContactMustExists(
      user.username,
      createRequest.contact_id,
    );

    const address = await this.prismaService.address.create({
      data: createRequest,
    });

    return {
      id: address.id,
      street: address.street,
      city: address.city,
      province: address.province,
      country: address.country,
      postal_code: address.postal_code,
    };
  }

  async get(user: User, request: GetAddressRequest): Promise<AddressResponse> {
    const getRequest: GetAddressRequest = this.validationService.validate(
      AddressValidation.GET,
      request,
    );

    await this.contactService.checkContactMustExists(
      user.username,
      getRequest.contact_id,
    );

    const address = await this.checkAddressMustExists(
      getRequest.contact_id,
      getRequest.address_id,
    );

    return {
      id: address.id,
      street: address.street,
      city: address.city,
      province: address.province,
      country: address.country,
      postal_code: address.postal_code,
    };
  }

  async update(
    user: User,
    request: UpdateAddressRequest,
  ): Promise<AddressResponse> {
    const updateRequest: UpdateAddressRequest = this.validationService.validate(
      AddressValidation.UPDATE,
      request,
    );

    await this.contactService.checkContactMustExists(
      user.username,
      updateRequest.contact_id,
    );

    let address = await this.checkAddressMustExists(
      updateRequest.contact_id,
      updateRequest.id,
    );

    address = await this.prismaService.address.update({
      where: {
        id: address.id,
        contact_id: address.contact_id,
      },
      data: updateRequest,
    });

    return {
      id: address.id,
      street: address.street,
      city: address.city,
      province: address.province,
      country: address.country,
      postal_code: address.postal_code,
    };
  }

  async checkAddressMustExists(
    contact_id: number,
    address_id: number,
  ): Promise<Address> {
    const address = await this.prismaService.address.findFirst({
      where: {
        id: address_id,
        contact_id: contact_id,
      },
    });

    if (!address) {
      throw new HttpException('Address not found', 404);
    }
    return address;
  }
}
