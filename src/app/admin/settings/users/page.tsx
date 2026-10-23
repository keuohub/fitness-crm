"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  ShieldCheck,
  UserPlus,
  User,
  Mail,
  Lock,
  Trash2,
  X,
  Power,
  KeyRound,
} from "lucide-react";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "主理人 (Owner)",
  manager: "店长 (Manager)",
  coach: "教练 (Coach)",
  viewer: "观察员 (Viewer)",
};

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New user modal
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("coach");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setUsers)
      .catch(() => showToast("读取管理员列表失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      showToast("请完整填写姓名、邮箱与密码", "error");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("管理员账号已成功创建", "success");
      setShowForm(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      fetchUsers();
    } else {
      showToast(data.error || "创建失败", "error");
    }
    setSubmitting(false);
  };

  const handleRoleChange = async (id: number, role: string) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    showToast("角色权限已更新", "success");
    fetchUsers();
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    showToast(`该账号已${newStatus === "active" ? "启用" : "停用"}`, "success");
    fetchUsers();
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const res = await fetch(`/api/admin/users?id=${deleteConfirmId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("管理员账号已成功删除", "success");
      setDeleteConfirmId(null);
      fetchUsers();
    } else {
      showToast("删除失败", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            SECURITY & ROLES · 权限与安全
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">管理员账号与角色分配</h1>
          <p className="text-sm text-[#697180] mt-1">
            创建及维护后台管理员与导师的登录凭证与访问权限。
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <UserPlus className="w-4 h-4" /> 新建管理账号
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E1E5EB] bg-[#F8FAFC] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#292D35]">管理员账号列表 ({users.length})</span>
          <span className="text-xs text-[#697180]">支持动态切换角色</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFBFD] border-b border-[#E1E5EB] text-[#697180] text-xs font-medium">
              <tr>
                <th className="px-5 py-3">账号信息</th>
                <th className="px-5 py-3">角色权限</th>
                <th className="px-5 py-3">账号状态</th>
                <th className="px-5 py-3">创建时间</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EB]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#697180]">
                    加载管理员列表中...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#697180]">
                    暂无管理员账号
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.status === "active";
                  return (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E8EEFF] text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                            {u.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-medium text-[#292D35] text-xs">{u.name}</div>
                            <div className="text-[11px] text-[#697180]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2.5 py-1 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] text-[#292D35]"
                        >
                          {Object.entries(ROLE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {isActive ? "正常" : "已停用"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-[#697180] tabular-nums">
                        {String(u.createdAt || "").slice(0, 10)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className="px-2.5 py-1 text-xs text-[#697180] bg-white border border-[#E1E5EB] hover:bg-[#F5F7FA] rounded transition-colors"
                          >
                            {isActive ? "停用" : "启用"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(u.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">新建管理账号</h3>
            <p className="text-xs text-[#697180] mt-1">设置管理员姓名、登录邮箱与初始密码。</p>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">姓名 *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="例如：运营助理"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">登录邮箱 *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="admin@laiwufit.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">初始密码 *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="至少6位密码"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">分配角色 *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  {Object.entries(ROLE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EB] mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? "正在创建..." : "确认创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">确认删除管理员账号？</h3>
            <p className="text-xs text-[#697180] mt-1">删除后该账号将无法再登录管理后台。</p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
