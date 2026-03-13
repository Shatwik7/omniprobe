import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { ILike, Repository } from 'typeorm';
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

  async search(name?: string, email?: string): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { name: name ? ILike(`%${name}%`) : undefined },
        { email: email ? ILike(`%${email}%`) : undefined },
      ],
      take: 10,
    });
  }

  async remove(id: string): Promise<boolean> {
    const user = await this.usersRepository.delete({ id: id });
    return user.affected != null && user.affected > 0 ? true : false;
  }
}
