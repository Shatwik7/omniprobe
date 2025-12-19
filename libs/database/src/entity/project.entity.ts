import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './team.entity';
import { Monitor } from './monitor.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // "Multiple Projects In Team"
  @ManyToOne(() => Team, (team) => team.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  // "Project has Multiple Monitors"
  @OneToMany(() => Monitor, (monitor) => monitor.project)
  monitors: Monitor[];
  
//   // Example: SLA Reports might be aggregated at the Project level
//   @OneToMany(() => SlaReport, (report) => report.project)
//   slaReports: SlaReport[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}