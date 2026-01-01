import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './team.entity';
import { Monitor } from './monitor.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('projects')
export class Project {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column({ nullable: true })
  description: string;

  // "Multiple Projects In Team"
  @ApiProperty()
  @ManyToOne(() => Team, (team) => team.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  // "Project has Multiple Monitors"
  @ApiProperty()
  @OneToMany(() => Monitor, (monitor) => monitor.project)
  monitors: Monitor[];
  
//   // Example: SLA Reports might be aggregated at the Project level
//   @OneToMany(() => SlaReport, (report) => report.project)
//   slaReports: SlaReport[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}