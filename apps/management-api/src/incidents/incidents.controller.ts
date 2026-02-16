import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

@Controller('teams/:teamId/projects/:projectId/monitors/:monitorId/incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @UseGuards(TeamMemberGuard)
  create(@Body() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.create(createIncidentDto);
  }

  @Get()
  @UseGuards(TeamMemberGuard)
  findAll(@Param('monitorId',ParseUUIDPipe) monitorId: string){
    return this.incidentsService.findAll(monitorId);
  }

  @Get(':id')
  @UseGuards(TeamMemberGuard)
  findOne(@Param('id',ParseUUIDPipe) id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TeamMemberGuard)
  update(@Param('id') id: string, @Body() updateIncidentDto: UpdateIncidentDto) {
    return this.incidentsService.update(+id, updateIncidentDto);
  }

  @Delete(':id')
  @UseGuards(TeamMemberGuard)
  remove(@Param('id',ParseUUIDPipe) id: string) {
    return this.incidentsService.remove(id);
  }
}
