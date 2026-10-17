'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, LoaderCircle } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { usersApi } from '@/lib/api/users';
import { storesApi } from '@/lib/api/stores';
import { RegistrationGroup, RegistrationStatus } from '@/types/order';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  canTransition,
  displayDate,
  money,
  registrationStatusLabel,
  REGISTRATION_STATUSES,
  vietnamDate,
} from '@/lib/registration-workspace';
import { styles } from './styles';

interface Draft {
  status: RegistrationStatus;
  store: string;
  assignee: string;
  note: string;
}
export function RegistrationDetail({
  target,
  admin,
  onClose,
  onSaved,
}: {
  target: RegistrationGroup;
  admin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const detail = useQuery({
    queryKey: ['registration-detail', target.id],
    queryFn: () => ordersApi.get(target.id),
    refetchOnWindowFocus: false,
  });
  const staff = useQuery({
    queryKey: ['registration-staff'],
    queryFn: usersApi.list,
    enabled: admin,
  });
  const stores = useQuery({ queryKey: ['registration-stores'], queryFn: () => storesApi.listPublic() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<RegistrationGroup | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const initialized = useRef(false);
  const group = saved ?? detail.data ?? target;
  useEffect(() => {
    if (detail.data && !initialized.current) {
      initialized.current = true;
      setDraft({
        status: detail.data.status,
        store: String(detail.data.store_id ?? ''),
        assignee: String(detail.data.assigned_to ?? ''),
        note: '',
      });
    }
  }, [detail.data]);
  const dirty =
    !!draft &&
    (draft.status !== group.status ||
      draft.store !== String(group.store_id ?? '') ||
      draft.assignee !== String(group.assigned_to ?? '') ||
      !!draft.note);
  const statusChanged = !!draft && draft.status !== group.status;
  const invalidNote =
    !!draft &&
    ((draft.status === 'huy' && statusChanged && !draft.note.trim()) ||
      (!!draft.note && !statusChanged));
  const save = useMutation({
    mutationFn: async () => {
      if (!draft || !canTransition(group.status, draft.status, admin))
        throw new Error('INVALID_TRANSITION');
      return ordersApi.updateStatus(group.id, {
        ...(statusChanged ? { status: draft.status, note: draft.note.trim() || undefined } : {}),
        ...(admin && draft.store !== String(group.store_id ?? '')
          ? { store_id: draft.store ? Number(draft.store) : null }
          : {}),
        ...(admin && draft.assignee !== String(group.assigned_to ?? '')
          ? { assigned_to: draft.assignee ? Number(draft.assignee) : null }
          : {}),
      });
    },
    onSuccess: (updated) => {
      setSaved(updated);
      setDraft({
        status: updated.status,
        store: String(updated.store_id ?? ''),
        assignee: String(updated.assigned_to ?? ''),
        note: '',
      });
      onSaved();
      showToast('Đã lưu đăng ký');
    },
    onError: () =>
      showToast('Không thể lưu. Đăng ký có thể đã thay đổi; hãy mở lại để kiểm tra.', 'error'),
  });
  function close() {
    if (
      save.isPending ||
      (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ thay đổi?'))
    )
      return;
    onClose();
  }
  async function receipt() {
    setPdfBusy(true);
    try {
      const url = URL.createObjectURL(await ordersApi.receipt(group.id));
      const link = document.createElement('a');
      link.href = url;
      link.download = `phieu-${group.code || group.id}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast('Không thể tải phiếu PDF.', 'error');
    } finally {
      setPdfBusy(false);
    }
  }
  return (
    <Modal isOpen onClose={close} title="Chi tiết đăng ký" maxWidth="xl">
      <div className={styles.detailContent}>
        {detail.isLoading && <p role="status">Đang tải chi tiết…</p>}
        {detail.isError && (
          <p role="alert">
            Không tải được chi tiết.{' '}
            <button className={styles.secondaryButton} onClick={() => void detail.refetch()}>
              Thử lại
            </button>
          </p>
        )}
        <section className={styles.detailSection}>
          <h3>{group.code || `#${group.id}`}</h3>
          <dl className={styles.detailGrid}>
            <div>
              <dt>Khách hàng</dt>
              <dd>{group.customer_name}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>
                <a href={`tel:${group.phone}`}>{group.phone}</a>
              </dd>
            </div>
            <div>
              <dt>Ngày tạo</dt>
              <dd>{displayDate(vietnamDate(new Date(group.created_at)))}</dd>
            </div>
            <div>
              <dt>Loại khách hàng</dt>
              <dd>{group.customer_type === 'business' ? 'Doanh nghiệp' : 'Cá nhân'}</dd>
            </div>
            {(group.delivery_address || group.delivery_store) && (
              <div className={styles.fullRow}>
                <dt>Địa chỉ / cửa hàng nhận</dt>
                <dd>
                  {group.delivery_store ||
                    [group.delivery_address, group.ward, group.province].filter(Boolean).join(', ')}
                </dd>
              </div>
            )}
            {group.note && (
              <div className={styles.fullRow}>
                <dt>Ghi chú của khách</dt>
                <dd className={styles.customerNote}>{group.note}</dd>
              </div>
            )}
          </dl>
        </section>
        <section className={styles.detailSection}>
          <h3>Sản phẩm đăng ký</h3>
          {!group.items.length ? (
            <p className={styles.warningText}>
              Đăng ký này không có sản phẩm. Cần đối chiếu dữ liệu gốc.
            </p>
          ) : (
            <div className={styles.productTable}>
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>SL</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.type === 'sim' ? 'SIM ' : ''}
                        {item.reference_label}
                        {Number(item.fee_snapshot) > 0 && (
                          <small>Phí hòa mạng: {money(item.fee_snapshot)} / sản phẩm</small>
                        )}
                        {item.price_snapshot === null && <small>Giá theo tư vấn</small>}
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        {money(
                          (Number(item.price_snapshot ?? 0) + Number(item.fee_snapshot ?? 0)) *
                            Number(item.quantity ?? 1),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.totalLine}>
            <strong>Tổng tiền</strong>
            <strong>{money(group.total_amount)}</strong>
          </p>
          <button
            className={styles.secondaryButton}
            disabled={pdfBusy}
            onClick={() => void receipt()}
          >
            {pdfBusy ? <LoaderCircle className={styles.spinning} /> : <Download />}Tải phiếu PDF
          </button>
        </section>
        {draft && (
          <section className={styles.detailSection}>
            <h3>Xử lý</h3>
            <fieldset className={styles.statusFieldset} disabled={save.isPending}>
              <legend>Trạng thái</legend>
              <div className={styles.statusSegments}>
                {REGISTRATION_STATUSES.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.segment} ${draft.status === option.value ? (option.value === 'moi' ? styles.statusNew : option.value === 'dang_xu_ly' ? styles.waiting : option.value === 'hoan_thanh' ? styles.statusConfirmed : styles.statusCancelled) : ''}`}
                    aria-pressed={draft.status === option.value}
                    disabled={!canTransition(group.status, option.value, admin)}
                    title={
                      !canTransition(group.status, option.value, admin)
                        ? 'Không thể chuyển sang trạng thái này'
                        : undefined
                    }
                    onClick={() => setDraft({ ...draft, status: option.value })}
                  >
                    <i />
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {admin && (
              <>
                <label className={styles.formField}>
                  <span>Cửa hàng xử lý</span>
                  <select
                    aria-label="Cửa hàng xử lý"
                    disabled={save.isPending || stores.isLoading || stores.isError}
                    value={draft.store}
                    onChange={(event) =>
                      setDraft({ ...draft, store: event.target.value, assignee: '' })
                    }
                  >
                    <option value="">Chưa phân công</option>
                    {draft.store &&
                      !stores.data?.some((store) => String(store.id) === draft.store) && (
                        <option value={draft.store}>Cửa hàng #{draft.store}</option>
                      )}
                    {stores.data?.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formField}>
                  <span>Người xử lý</span>
                  <select
                    aria-label="Người xử lý"
                    disabled={save.isPending || staff.isLoading || staff.isError}
                    value={draft.assignee}
                    onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}
                  >
                    <option value="">Chưa phân công</option>
                    {draft.assignee &&
                      !staff.data?.some((person) => String(person.id) === draft.assignee) && (
                        <option value={draft.assignee}>Nhân viên #{draft.assignee}</option>
                      )}
                    {staff.data
                      ?.filter(
                        (person) =>
                          String(person.id) === draft.assignee ||
                          (person.status === 'active' &&
                            (!draft.store || String(person.store_id) === draft.store)),
                      )
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name}
                        </option>
                      ))}
                  </select>
                  {staff.isError && <small>Không tải được danh sách nhân viên.</small>}
                </label>
              </>
            )}
            <label className={styles.formField}>
              <span>Ghi chú xử lý / lý do hủy</span>
              <textarea
                className={styles.textArea}
                value={draft.note}
                maxLength={1000}
                rows={3}
                disabled={save.isPending}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
              <small>
                Ghi chú được lưu trong lịch sử khi đổi trạng thái. Hủy đăng ký cần có lý do.
              </small>
            </label>
            {invalidNote && (
              <p role="alert" className={styles.warningText}>
                {!statusChanged
                  ? 'Hãy đổi trạng thái để lưu ghi chú xử lý.'
                  : 'Vui lòng nhập lý do hủy.'}
              </p>
            )}
            <p className={styles.infoText}>
              Chưa hỗ trợ lưu ghi chú nội bộ riêng khi giữ nguyên trạng thái.
            </p>
          </section>
        )}
        <section className={styles.detailSection}>
          <h3>Email</h3>
          <p className={styles.infoText}>
            Xác nhận đăng ký (registration_received_customer): chưa thể đối chiếu trạng thái gửi.
          </p>
          <p className={styles.infoText}>
            Cập nhật trạng thái (registration_status_changed): chưa thể đối chiếu trạng thái gửi.
          </p>
          <p className={styles.infoText}>
            Chưa hỗ trợ xem và gửi lại đúng thư của đăng ký tại đây.
          </p>
          {admin && <a href="/admin/email">Mở quản lý email</a>}
        </section>
        <section className={styles.detailSection}>
          <h3>Lịch sử xử lý</h3>
          <ol className={styles.timeline}>
            {group.events?.length ? (
              group.events.map((event, index) => (
                <li key={index}>
                  <strong>{registrationStatusLabel(event.to_status)}</strong> ·{' '}
                  {new Date(event.created_at).toLocaleTimeString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {displayDate(vietnamDate(new Date(event.created_at)))}
                  <div>
                    {event.actor_id
                      ? staff.data?.find((person) => person.id === event.actor_id)?.full_name ||
                        `Nhân viên #${event.actor_id}`
                      : 'Tiếp nhận đăng ký'}
                  </div>
                  {event.note && <p className={styles.customerNote}>{event.note}</p>}
                </li>
              ))
            ) : (
              <li>Chưa có dữ liệu lịch sử xử lý.</li>
            )}
          </ol>
        </section>
        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} disabled={save.isPending} onClick={close}>
            Đóng
          </button>
          <button
            className={styles.saveButton}
            disabled={!draft || !dirty || invalidNote || save.isPending || detail.isError}
            onClick={() => save.mutate()}
          >
            {save.isPending && <LoaderCircle className={styles.spinning} />}Lưu
          </button>
        </footer>
      </div>
    </Modal>
  );
}
