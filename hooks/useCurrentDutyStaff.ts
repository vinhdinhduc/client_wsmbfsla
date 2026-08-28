import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/lib/api/shifts';

/**
 * Hook dung chung cho Hotline dong (Header/Footer/lien-he/cua-hang) - tranh
 * goi API trung lap nhieu lan tren cung 1 trang (muc 16 dau bai). React-query
 * tu cache theo query key nen nhieu component goi hook nay chi ban 1 request.
 */
export function useCurrentDutyStaff() {
  return useQuery({
    queryKey: ['current-duty-staff'],
    queryFn: () => shiftsApi.currentDutyStaff(),
    staleTime: 60_000,
  });
}
