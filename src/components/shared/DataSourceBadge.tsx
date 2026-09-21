import { Badge } from '@/components/ui';

export function DataSourceBadge({ source }: { source: 'real' | 'mock' }) {
  return (
    <Badge variant={source === 'real' ? 'success' : 'outline'} size="sm">
      {source === 'real' ? 'Live from backend' : 'Demo data — backend offline'}
    </Badge>
  );
}
