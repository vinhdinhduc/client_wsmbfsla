import { CartItem } from '@/types/order';

/**
 * Gio hang (CartContext) chi song o client/localStorage - KHONG co Server Action
 * nao "them/xoa" gio hang thuc su duoc (muc 16: gio hang khong goi API khi
 * them/xoa). Helper nay chi lam nhiem vu serialize danh sach CartItem hien tai
 * thanh chuoi JSON gon (type + reference_id) de dinh kem vao FormData truoc khi
 * goi actions/registration.ts::submitRegistrationAction.
 */
export function serializeCartItemsForSubmit(items: CartItem[]): string {
  return JSON.stringify(items.map((item) => ({ type: item.type, reference_id: item.reference_id })));
}
