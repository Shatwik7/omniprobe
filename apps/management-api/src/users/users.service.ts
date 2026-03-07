import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { User } from '@app/database';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(page: number, limit: number) {
    const users = this.usersRepository.find({
      relations: ['createdTeams', 'teams'],
      skip: page * limit,
      take: limit,
    });
    return;
  }

  findOne(id: string) {
    const user = this.usersRepository.findOne({ where: { id: id } });
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: string): Promise<boolean> {
    const user = await this.usersRepository.delete({ id: id });
    return user.affected != null && user.affected > 0 ? true : false;
  }
}
