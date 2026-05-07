"use client";

import { useState } from "react";
import {
  ActionPanel,
  CommonForm,
  CommonFormItems,
  getCommonFormRuleErrors,
  type CommonFormItem,
} from "@/components/shared/common";
import { ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { useCreateUserMutation, useUpdateUserMutation } from "@/hooks/api";
import {
  parseStaticRoleIdToPayload,
  primaryRoleIdStringFromUser,
  STATIC_USER_ROLE_SELECT_OPTIONS,
} from "@/constants/static-user-roles";
import type { User } from "@/types/auth";
import type { UserCreateOrEditRequest } from "@/types/users";

export type UserFormDraft = {
  userName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  avatar: string;
  status: boolean;
  roleIds: string;
};

const EMPTY_USER_DRAFT: UserFormDraft = {
  userName: "",
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phoneNumber: "",
  avatar: "",
  status: true,
  roleIds: "",
};

function toDraft(user: User | null): UserFormDraft {
  if (!user) return { ...EMPTY_USER_DRAFT };
  return {
    userName: user.userName,
    fullName: user.fullName,
    email: user.email,
    password: "",
    confirmPassword: "",
    phoneNumber: user.phoneNumber ?? "",
    avatar: user.avatar ?? "",
    status: user.status,
    roleIds: primaryRoleIdStringFromUser(user.roles),
  };
}

export const USER_FORM_ITEMS: CommonFormItem<UserFormDraft>[] = [
  {
    type: "row",
    columnsClassName: "md:grid-cols-2",
    children: [
      {
        type: "input",
        name: "userName",
        label: "Tên đăng nhập",
        placeholder: "Nhập tên đăng nhập",
        rules: { required: true, minLength: 3, maxLength: 100 },
      },
      {
        type: "input",
        name: "fullName",
        label: "Họ và tên",
        placeholder: "Nhập họ và tên",
        rules: { required: true, minLength: 2, maxLength: 150 },
      },
    ],
  },
  {
    type: "row",
    columnsClassName: "md:grid-cols-2",
    children: [
      {
        type: "email",
        name: "email",
        label: "Email",
        placeholder: "Nhập email",
        rules: { required: true, emailFormat: true, maxLength: 200 },
      },
      {
        type: "input",
        name: "phoneNumber",
        label: "Số điện thoại",
        placeholder: "Nhập số điện thoại",
        rules: { maxLength: 30 },
      },
    ],
  },
  {
    type: "row",
    columnsClassName: "md:grid-cols-2",
    children: [
      {
        type: "password",
        name: "password",
        label: "Mật khẩu",
        placeholder: "Nhập mật khẩu",
        rules: { minLength: 6, maxLength: 200 },
      },
      {
        type: "password",
        name: "confirmPassword",
        label: "Nhập lại mật khẩu",
        placeholder: "Nhập lại mật khẩu",
        rules: {
          maxLength: 200,
          validate: (_value, all) => {
            const pw = String(all.password ?? "").trim();
            const cf = String(all.confirmPassword ?? "").trim();
            if (!pw && !cf) return undefined;
            if (!pw && cf) return "Chưa nhập mật khẩu.";
            if (pw && !cf) return "Vui lòng nhập lại mật khẩu.";
            if (pw !== cf) return "Mật khẩu nhập lại không khớp.";
            return undefined;
          },
        },
      },
    ],
  },
  {
    type: "row",
    columnsClassName: "md:grid-cols-3",
    children: [
      {
        type: "select",
        name: "roleIds",
        label: "Vai trò",
        placeholder: "Chọn vai trò",
        options: STATIC_USER_ROLE_SELECT_OPTIONS,
      },
      {
        type: "image",
        name: "avatar",
        label: "Ảnh đại diện (URL)",
        rules: { maxLength: 500 },
      },
      {
        type: "switch",
        name: "status",
        label: "Hoạt động",
        switchMapping: [
          { key: true, text: "Đang hoạt động" },
          { key: false, text: "Bị khóa" },
        ],
      },
    ],
  },
];

type CreateOrEditUserPanelProps = {
  open: boolean;
  mode: "add" | "edit";
  editingUser: User | null;
  token?: string;
  onOpenChange: (open: boolean) => void;
};

export function CreateOrEditUserPanel({
  open,
  mode,
  editingUser,
  token,
  onOpenChange,
}: CreateOrEditUserPanelProps) {
  const [values, setValues] = useState<UserFormDraft>(() =>
    toDraft(editingUser),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormDraft, string>>
  >({});
  const createMutation = useCreateUserMutation(token);
  const updateMutation = useUpdateUserMutation(token);

  const buildPayload = (): UserCreateOrEditRequest => {
    const roleIds = parseStaticRoleIdToPayload(values.roleIds);
    return {
      userName: values.userName.trim(),
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password.trim() || undefined,
      phoneNumber: values.phoneNumber.trim() || undefined,
      avatar: values.avatar.trim() || undefined,
      status: values.status,
      roleIds,
    };
  };

  const handleConfirm = (): boolean => {
    const nextErrors = getCommonFormRuleErrors(USER_FORM_ITEMS, values);
    if (mode === "add" && !values.password.trim()) {
      nextErrors.password = "Mật khẩu là bắt buộc khi tạo mới.";
    }
    const pw = values.password.trim();
    const cf = values.confirmPassword.trim();
    if (pw && !cf) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    if (!token) {
      setErrors((prev) => ({
        ...prev,
        userName:
          prev.userName ?? "Thiếu access token. Vui lòng đăng nhập lại.",
      }));
      return false;
    }

    const payload = buildPayload();
    if (mode === "add") {
      createMutation.mutate(payload, {
        onSuccess: (user) => {
          toast.success("Đã tạo người dùng", {
            description: user.userName,
          });
          onOpenChange(false);
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Không thể tạo người dùng.";
          toast.error("Tạo thất bại", { description: message });
        },
      });
      return false;
    }
    if (!editingUser) return false;
    updateMutation.mutate(
      { id: editingUser.id, payload },
      {
        onSuccess: (user) => {
          toast.success("Đã cập nhật", {
            description: user.userName,
          });
          onOpenChange(false);
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Không thể cập nhật.";
          toast.error("Cập nhật thất bại", { description: message });
        },
      },
    );
    return false;
  };

  return (
    <ActionPanel
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setErrors({});
        }
        onOpenChange(nextOpen);
      }}
      title={mode === "add" ? "Thêm người dùng" : "Sửa người dùng"}
      onConfirm={handleConfirm}
    >
      <CommonForm
        id="admin-user-form"
        className="min-w-0"
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
      >
        <CommonFormItems
          idPrefix="admin-user"
          items={USER_FORM_ITEMS}
          values={values}
          errors={errors}
          onValuesChange={(patch) => {
            setValues((prev) => ({ ...prev, ...patch }));
            setErrors((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(patch) as (keyof UserFormDraft)[]) {
                delete next[key];
              }
              if ("password" in patch) delete next.confirmPassword;
              return next;
            });
          }}
        />
      </CommonForm>
    </ActionPanel>
  );
}
