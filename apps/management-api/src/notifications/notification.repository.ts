import { EntityRepository, Repository } from 'typeorm';
import { Notification } from '@app/database';

@EntityRepository(Notification)
export class NotificationRepository extends Repository<Notification> {


    async findByTeamId(teamId: string): Promise<Notification[]> {
        return this.createQueryBuilder('notification')
            .leftJoinAndSelect('notification.project', 'project')
            .leftJoinAndSelect('project.team', 'team')
            .where('team.id = :teamId', { teamId })
            .getMany();
    }
}
