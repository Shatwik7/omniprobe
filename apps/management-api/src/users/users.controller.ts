import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  Request,
  ParseUUIDPipe,
  Query,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { SignUpDto } from '../auth/dto/signup.dto';
import { User } from '@app/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { SignInDtoResponse } from '../auth/dto/sign-in-response.dto';

@Controller()
export class UsersController {
  private logger = new Logger();
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('/signup')
  create(@Body() createUserDto: SignUpDto): Promise<Partial<User>> {
    this.logger.log(createUserDto);
    return this.authService.register(createUserDto);
  }

  @Post('/signin')
  @UseGuards(LocalAuthGuard)
  login(@Request() req: { user: User }): SignInDtoResponse {
    const res: SignInDtoResponse = this.authService.createAccessToken(req.user);
    return res;
  }

  @Get()
  findAll(
    @Request() req,
    @Query('take', ParseIntPipe) take: number = 10,
    @Query('skip', ParseIntPipe) skip: number = 0,
  ) {
    if (take > 100) {
      throw new ForbiddenException();
    }
    return this.usersService.findAll(req.query.page, req.query.limit);
  }

  @Get('/users/search')
  search(
    @Request() req,
    @Query('name') name: string,
    @Query('email') email: string,
  ) {
    return this.usersService.search(name, email);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  findme(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get('/users/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('/users/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete('/users/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
