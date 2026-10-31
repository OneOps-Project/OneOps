type Field = {
  key: string;
  label: string;
  type: string;
  options?: readonly string[];
};
export const definition = {
  id: "work-management/tasks",
  icon: 2,
  label: "Công việc",
  title: "Công việc",
  singular: "công việc",
  dateLabel: "Hạn hoàn thành",
  personLabel: "Người thực hiện",
  reviewerLabel: "Người kiểm tra",
  tabs: [],
  sections: [],
  statuses: [
    "Cần làm",
    "Đang làm",
    "Làm lại",
    "Chờ kiểm tra",
    "Hoãn lại",
    "Hoàn thành",
    "Đã hủy",
  ],
  statusDescriptions: {
    "Cần làm": "Task được tạo, chưa bắt đầu",
    "Đang làm": "Người phụ trách đang thực hiện",
    "Làm lại": "Người kiểm tra yêu cầu sửa lại",
    "Chờ kiểm tra": "Chờ người kiểm tra duyệt",
    "Hoãn lại": "Tạm hoãn bởi Quản lý",
    "Hoàn thành": "Đã hoàn thành, xác nhận bởi Người kiểm tra",
    "Đã hủy": "Đã hủy bởi Quản lý",
  },
  fields: [
    {
      key: "project",
      label: "Dự án",
      type: "text",
    },
    {
      key: "priority",
      label: "Mức ưu tiên",
      type: "select",
      options: ["Thấp", "Trung bình", "Cao", "Khẩn cấp"],
    },
    {
      key: "progress",
      label: "Tiến độ (%)",
      type: "number",
    },
    {
      key: "startDate",
      label: "Ngày bắt đầu",
      type: "date",
    },
    {
      key: "tags",
      label: "Nhãn",
      type: "text",
    },
  ],
  navigation: {
    title: "Công việc",
    collapsed: false,
    defaultSection: "Tất cả",
    allSection: "Tất cả",
    items: [
      {
        label: "Tất cả",
        href: "/work-management/tasks",
      },
      {
        label: "Việc của tôi",
        href: "/work-management/tasks/my-tasks",
      },
      {
        label: "Cần làm",
        href: "/work-management/tasks?status=Cần làm&section=Cần làm",
      },
      {
        label: "Đang làm",
        href: "/work-management/tasks?status=Đang làm&section=Đang làm",
      },
      {
        label: "Làm lại",
        href: "/work-management/tasks?status=Làm lại&section=Làm lại",
      },
      {
        label: "Chờ kiểm tra",
        href: "/work-management/tasks?status=Chờ kiểm tra&section=Chờ kiểm tra",
      },
      {
        label: "Hoàn thành",
        href: "/work-management/tasks?status=Hoàn thành&section=Hoàn thành",
      },
      {
        label: "Cần giao lại",
        href: "/work-management/tasks/flagged",
      },
    ],
  },
} as const;
export const fields: readonly Field[] = definition.fields;
