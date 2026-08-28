import { useAuthContext } from '@/contexts/AuthContext';

/** Wrapper mong quanh AuthContext - noi tap trung de cac component Admin import. */
export function useAuth() {
  return useAuthContext();
}
