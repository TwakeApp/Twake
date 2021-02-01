import { Resource } from 'services/CollectionsReact/Collections';

export type NotificationType = {
  user_id: string;
  company_id: string;
  workspace_id: string | 'all';
  channel_id: string | 'all';
  thread_id: string | 'all';

  count: number;
};

export class NotificationResource extends Resource<NotificationType> {
  _type = 'notification';
}
