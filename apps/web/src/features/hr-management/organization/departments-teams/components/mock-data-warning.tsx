import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function MockDataWarning() {
  return (
    <aside
      className={styles.mockDataWarning}
      role="note"
      aria-label="Cảnh báo dữ liệu mô phỏng"
    >
      ⚠️ Đang sử dụng dữ liệu Mock (Accounts/Auth). Các chức năng CRUD hoạt động
      bình thường, nhưng dữ liệu người dùng/nhóm có thể bị reset hoặc mất đồng
      bộ khi khởi động lại ứng dụng. Chờ tích hợp Auth thật.
    </aside>
  );
}
