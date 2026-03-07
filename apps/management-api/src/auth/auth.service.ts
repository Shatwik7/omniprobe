import { User } from '@app/database/entity/user.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  async validateEmailPassword(SignInDto: SignInDto) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: SignInDto.email })
      .getOne();
    if (user == undefined) return null;
    const valid = await argon2.verify(user?.password, SignInDto.password);
    if (!valid) return null;
    const { password, ...result } = user;
    return result;
  }

  //login
  createAccessToken(user: User) {
    return {
      access_token: this.jwtService.sign(user),
    };
  }

  async decode(token: string) {
    return this.jwtService.decode(token);
  }

  async register(data: SignUpDto): Promise<Partial<User>> {
    const existing = await this.usersRepository.findOne({
      where: { email: data.email },
    });
    if (existing) throw new UnauthorizedException('User already exists');

    const argon2Options: argon2.Options = {
      memoryCost: 2000,
      timeCost: 10,
      parallelism: 2,
      hashLength: 252,
    };
    const user = this.usersRepository.create({
      name: data.name,
      email: data.email,
      password: await argon2.hash(data.password, argon2Options),
    });

    const { password, ...User } = await this.usersRepository.save(user);
    return User;
  }
}
