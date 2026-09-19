'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

export default function AiChatLogsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data = [] } = useQuery({ queryKey: ['ai-chat-logs'], queryFn: () => aiApi.listLogs() });
  const update = useMutation({
    mutationFn: (id: number) => aiApi.updateLog(id, { flagged_for_review: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chat-logs'] });
      showToast('Đã đánh dấu cần cải thiện');
    },
  });
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử hội thoại AI</h1>
          <p>Rà soát các câu trả lời để bổ sung dữ liệu tri thức.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['ai-chat-logs'] })}
        >
          Làm mới
        </Button>
      </div>
      <div className={styles.list}>
        {data.map((item) => (
          <article className={styles.log} key={item.id}>
            <small>
              {new Date(item.created_at).toLocaleString('vi-VN')} · {item.session_id}
            </small>
            <p className={styles.question}>
              <strong>Khách:</strong> {item.user_message}
            </p>
            <p>
              <strong>AI:</strong> {item.ai_response}
            </p>
            <Button
              size="sm"
              variant={item.flagged_for_review ? 'danger' : 'outline'}
              disabled={item.flagged_for_review}
              isLoading={update.isPending}
              onClick={() => update.mutate(item.id)}
            >
              {item.flagged_for_review ? 'Đã đánh dấu' : 'Cần cải thiện'}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
