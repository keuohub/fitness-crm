"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  coach: "Coach",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "#3E2723",
  manager: "#8B5E3C",
  coach: "#9E8E7E",
  viewer: "#D1C8C0",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── New user form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("coach");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setUsers)
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("创建成功");
      setShowForm(false);
      setFormName(""); setFormEmail(""); setFormPassword("");
      fetchUsers();
    } else {
      setMsg(data.error || "创建失败");
    }
    setSubmitting(false);
  };

  const handleRoleChange = async (id: number, role: string) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    fetchUsers();
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchUsers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该管理员？")) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
    else alert("删除失败");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#3E2723]">管理员管理</h1>
          <p className="text-sm text-[#9E8E7E] mt-1">创建和管理后台管理员账号</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: COLORS.primary }}
        >
          + 新增管理员
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 rounded-2xl bg-white border border-[#EDE8E2] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#9E8E7E] mb-1">姓名</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-[#FAF7F2] text-sm border border-[#E8E0D5]" required />
            </div>
            <div>
              <label className="block text-xs text-[#9E8E7E] mb-1">邮箱</label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-[#FAF7F2] text-sm border border-[#E8E0D5]" required />
            </div>
            <div>
              <label className="block text-xs text-[#9E8E7E] mb-1">密码</label>
              <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-[#FAF7F2] text-sm border border-[#E8E0D5]" required />
            </div>
            <div>
              <label className="block text-xs text-[#9E8E7E] mb-1">角色</label>
              <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-[#FAF7F2] text-sm border border-[#E8E0D5]">
                <option value="coach">Coach - 教练</option>
                <option value="manager">Manager - 经理</option>
                <option value="owner">Owner - 所有者</option>
                <option value="viewer">Viewer - 只读</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: COLORS.primary }}>
              {submitting ? "创建中..." : "创建"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-[#9E8E7E]">取消</button>
            {msg && <span className="text-xs" style={{ color: msg.includes("失败") ? "#D4736A" : "#16a34a" }}>{msg}</span>}
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-[#9E8E7E]">加载中...</div>
      ) : error ? (
        <div className="text-center py-12 text-sm" style={{ color: "#D4736A" }}>{error}</div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-[#EDE8E2]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F2] text-left">
                <th className="px-4 py-3 font-medium text-[#9E8E7E]">姓名</th>
                <th className="px-4 py-3 font-medium text-[#9E8E7E]">邮箱</th>
                <th className="px-4 py-3 font-medium text-[#9E8E7E]">角色</th>
                <th className="px-4 py-3 font-medium text-[#9E8E7E]">状态</th>
                <th className="px-4 py-3 font-medium text-[#9E8E7E]">创建时间</th>
                <th className="px-4 py-3 font-medium text-[#9E8E7E]">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#EDE8E2]">
                  <td className="px-4 py-3 text-[#3E2723] font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-[#3E2723]">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 rounded-lg text-xs border border-[#E8E0D5]"
                      style={{ color: ROLE_COLORS[u.role] || "#9E8E7E" }}
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="coach">Coach</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#9E8E7E] text-xs">{u.createdAt?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs font-medium"
                      style={{ color: "#D4736A" }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
