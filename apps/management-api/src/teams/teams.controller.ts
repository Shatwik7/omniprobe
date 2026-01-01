import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseUUIDPipe, Put } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Team } from '@app/database';
import { ApiAcceptedResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse } from '@nestjs/swagger';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    description: 'The record has been successfully created.',
    type: Team,
  })
  create(@Body() createTeamDto: CreateTeamDto,@Request() req):Promise<Team> {
    return this.teamsService.create(createTeamDto.name,req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiAcceptedResponse({
    description: 'The record has been successfully created.',
    type: Team,
  })
  findAll(@Request() req:{ user: {id:string}}): Promise<{Teams:Team[], Count:number}>{
    return this.teamsService.findAll(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id',ParseUUIDPipe) id: string ) {
    return this.teamsService.findOne(id);
  }

  @Put(':id/addUser')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id',ParseUUIDPipe) id: string) {
    return this.teamsService.remove(id);
  }
}
