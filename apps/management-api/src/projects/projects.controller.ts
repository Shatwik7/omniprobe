import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Request, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { Project } from '@app/database';
import { ApiResponse } from '@nestjs/swagger';

@Controller('teams/:teamId/projects')
@UseGuards(JwtAuthGuard,TeamMemberGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiResponse(
    { 
      status: 201, 
      description: 'CREATES A NEW PROJECT IN THE TEAM',
      type: Project 
    })
  create(
    @Param('teamId',ParseUUIDPipe) teamId: string,
    @Body() createProjectDto: CreateProjectDto, 
    @Request() req:{ user: {id:string}}
  ) : Promise<Project> {
    return this.projectsService.create(createProjectDto,teamId);
  }

  @Get()
  @ApiResponse(
    { 
      status: 200,
      description: 'GETS ALL PROJECTS IN THE TEAM',
      type: Project,
      isArray:true
    })
  findAll(@Param('teamId',ParseUUIDPipe) teamId: string, @Request() req:{ user: {id:string}}) {
    return this.projectsService.findAll(teamId,req.user.id);
  }

  
  @Get(':id')
  @ApiResponse(
    {
      status: 200,
      description: 'GETS A SINGLE PROJECT BY ID',
      type: Project, 
    })
  async findOne(@Param('id',ParseUUIDPipe) id: string):Promise<Project> {
    const project= await this.projectsService.findOne(id);
    if(!project) throw new NotFoundException('Project not found')
    return project
  }

  @Patch(':id')
  @ApiResponse(
    {
      status: 200,
      description: 'UPDATES A PROJECT BY ID',
      type: String,
    })
  update(@Param('id',ParseUUIDPipe) id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(+id, updateProjectDto);
  }

  @Delete(':id')
  @ApiResponse(
    {
      status: 200,
      description: 'DELETES A PROJECT BY ID',
      type: Boolean, 
    })
  remove(@Param('id',ParseUUIDPipe) id: string, @Request() req:{ user: {id:string}}):Promise<boolean> {
    return this.projectsService.remove(id,req.user.id);
  }
}
