import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, Team } from '@app/database';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProjectsService {

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,

    @InjectRepository(Team)
    private readonly teamsRepo: Repository<Team>
  ) {
  }


  create(createProjectDto: CreateProjectDto,teamId:string): Promise<Project> {
    const project = this.projectsRepo.create({ name: createProjectDto.name, team:{id:teamId}, description: createProjectDto.description});
    return this.projectsRepo.save(project);
  }

  findAll(teamId: string, userId: string): Promise<Project[]> {
    return this.projectsRepo.find({ where: { team: { id: teamId } } });
  }

  findOne(id: string): Promise<Project | null> {
    const project = this.projectsRepo.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        team: {
          id: true,
          members: {
            id: true,
          }
        },
        monitors: {
          id: true,
          name: true,
          target: true,
          method: true,
          frequencySeconds: true,
        }
      },
      relations: ['team', 'monitors']
    });
    return project;
  }

  update(id: number, updateProjectDto: UpdateProjectDto) {
    return `This action updates a #${id} project`;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const Project = await this.projectsRepo.findOne(
      {
        where: { id },
        relations: ['team'],
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          team: {
            id: true,
            name: true,
            createdBy: true,
            members: {
              id: true
            }
          }
        }
      });

    if (Project?.team.createdBy.id !== userId) throw new UnauthorizedException("User is not the owner of the project");

    const { affected } = await this.projectsRepo.delete(id);

    return Boolean(affected && affected > 0);
  }
}
