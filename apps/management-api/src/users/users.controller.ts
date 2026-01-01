import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { SignUpDto } from '../auth/dto/signup.dto';
import { User } from '@app/database';
import { SignInDto } from '../auth/dto/sign-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { SignInDtoResponse } from '../auth/dto/sign-in-response.dto';

@Controller()
export class UsersController {
  private logger=new Logger();
  constructor(
    private readonly usersService: UsersService,
    private readonly authService:AuthService,
  ) {}



  @Post('/signup')
  create(@Body() createUserDto: SignUpDto):Promise<Partial<User>> {
    this.logger.log(createUserDto);
    return this.authService.register(createUserDto);
  }


  @Post('/signin')
  @UseGuards(LocalAuthGuard)
  login(@Request() req: { user: User }): SignInDtoResponse {
    const res:SignInDtoResponse=this.authService.createAccessToken(req.user);
    return res;
  }


  @Get('/me')
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
