"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  BookOpen,
  DoorOpen,
  Plus,
  Clock,
  Users,
  Power,
  X,
  Layers,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";

type Course = {
  id: number;
  key: string;
  name: string;
  duration_minutes: number;
  default_capacity: number;
  color: string | null;
  sort_order: number;
  is_active: number;
};
type Room = { id: number; name: string; capacity: number; is_active: number };

async function jf(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "请求失败";
}

export default function AdminCoursesPage() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [c, setC] = useState({
    key: "",
    name: "",
    durationMinutes: "60",
    defaultCapacity: "6",
    color: "",
    sortOrder: "0",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    durationMinutes: "60",
    defaultCapacity: "6",
    color: "",
    sortOrder: "0",
  });
  const [r, setR] = useState({ name: "", capacity: "10" });

  const nextSortOrder = () =>
    courses.reduce((max, x) => Math.max(max, Number(x.sort_order) || 0), -1) + 1;

  const openAddCourse = () => {
    const next = nextSortOrder();
    setC({ key: "", name: "", durationMinutes: "60", defaultCapacity: "6", color: "", sortOrder: String(next) });
    setShowAddCourse(true);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [a, b] = await Promise.all([jf("/api/admin/courses"), jf("/api/admin/rooms")]);
      setCourses(a);
      setRooms(b);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!c.name.trim()) {
      showToast("请填写课程名称", "error");
      return;
    }
    const key = c.key.trim() || `course_${Date.now().toString(36)}`;
    setSaving(true);
    try {
      await jf("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: c.name,
          durationMinutes: Number(c.durationMinutes),
          defaultCapacity: Number(c.defaultCapacity),
          color: c.color,
          sortOrder: c.sortOrder === "" ? nextSortOrder() : Number(c.sortOrder),
        }),
      });
      setC({ key: "", name: "", durationMinutes: "60", defaultCapacity: "6", color: "", sortOrder: "0" });
      setShowAddCourse(false);
      await load();
      showToast("课程类目已成功新增", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r.name) {
      showToast("请填写教室名称", "error");
      return;
    }
    setSaving(true);
    try {
      await jf("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: r.name, capacity: Number(r.capacity) }),
      });
      setR({ name: "", capacity: "10" });
      setShowAddRoom(false);
      await load();
      showToast("教室已成功新增", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleCourse = async (x: Course) => {
    const nextState = x.is_active ? 0 : 1;
    try {
      await jf("/api/admin/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: x.id, isActive: nextState }),
      });
      await load();
      showToast(`已${nextState ? "启用" : "停用"}该课程类目`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const openEditCourse = (x: Course) => {
    setEditing(x);
    setEditForm({
      name: x.name,
      durationMinutes: String(x.duration_minutes),
      defaultCapacity: String(x.default_capacity),
      color: x.color || "",
      sortOrder: String(x.sort_order),
    });
  };

  const saveEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim()) {
      showToast("课程名称不能为空", "error");
      return;
    }
    setSaving(true);
    try {
      await jf("/api/admin/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: editForm.name,
          durationMinutes: Number(editForm.durationMinutes),
          defaultCapacity: Number(editForm.defaultCapacity),
          color: editForm.color,
          sortOrder: Number(editForm.sortOrder),
        }),
      });
      setEditing(null);
      await load();
      showToast("课程类目已更新", "success");
    } catch (e) {
      showToast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const moveCourse = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= courses.length) return;
    const a = courses[index];
    const b = courses[target];
    setSaving(true);
    try {
      if (Number(a.sort_order) === Number(b.sort_order)) {
        // 历史数据排序值可能相同（都为 0）：按当前展示顺序重新编号，确保点击后一定生效
        const next = [...courses];
        next.splice(index, 1);
        next.splice(target, 0, a);
        for (let i = 0; i < next.length; i++) {
          const order = (i + 1) * 10;
          if (Number(next[i].sort_order) !== order) {
            await jf("/api/admin/courses", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: next[i].id, sortOrder: order }),
            });
          }
        }
      } else {
        // 常规情况：只交换这两条的 sort_order，两次 PUT
        await jf("/api/admin/courses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id, sortOrder: b.sort_order }),
        });
        await jf("/api/admin/courses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id, sortOrder: a.sort_order }),
        });
      }
      await load();
      showToast("排序已更新", "success");
    } catch (e) {
      showToast(errMsg(e), "error");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await jf(`/api/admin/courses?id=${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
      showToast("课程类目已删除", "success");
    } catch (e) {
      setDeleteTarget(null);
      showToast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleRoom = async (x: Room) => {
    const nextState = x.is_active ? 0 : 1;
    try {
      await jf("/api/admin/rooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: x.id, isActive: nextState }),
      });
      await load();
      showToast(`已${nextState ? "启用" : "停用"}该教室`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            RESOURCES · 课程与教室
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">课程类目与教室配置</h1>
          <p className="text-sm text-[#697180] mt-1">
            维护排课所用的标准课程大类与场馆可用活动室。停用不会影响既有历史排课与消课数据。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddRoom(true)}
            className="px-3.5 py-2 text-xs font-medium text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <DoorOpen className="w-3.5 h-3.5 text-[#697180]" /> 新增教室
          </button>
          <button
            onClick={openAddCourse}
            className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新增课程类目
          </button>
        </div>
      </div>

      {/* Grid of Two Columns: Courses vs Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Courses Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E1E5EB] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-semibold text-[#292D35]">课程类目列表 ({courses.length})</h2>
            </div>
            <span className="text-xs text-[#697180]">排课核心科目</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFBFD] border-b border-[#E1E5EB] text-[#697180] text-xs font-medium">
                <tr>
                  <th className="px-5 py-3">类目名称</th>
                  <th className="px-5 py-3">规格</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3">排序</th>
                  <th className="px-5 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5EB]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#697180]">
                      加载中...
                    </td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#697180]">
                      暂无课程类目
                    </td>
                  </tr>
                ) : (
                  courses.map((x, i) => (
                    <tr key={x.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-[#292D35] text-sm">{x.name}</div>
                        <div className="text-[11px] font-mono text-[#697180]">{x.key}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#697180] tabular-nums">
                        <div>时长: <span className="text-[#292D35] font-medium">{x.duration_minutes}</span> 分钟</div>
                        <div>默认: <span className="text-[#292D35] font-medium">{x.default_capacity}</span> 人</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            x.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {x.is_active ? "已启用" : "已停用"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveCourse(i, -1)}
                            disabled={i === 0 || saving}
                            title="上移"
                            className="p-1 rounded border border-[#E1E5EB] bg-white text-[#697180] hover:text-[#2563EB] hover:border-blue-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCourse(i, 1)}
                            disabled={i === courses.length - 1 || saving}
                            title="下移"
                            className="p-1 rounded border border-[#E1E5EB] bg-white text-[#697180] hover:text-[#2563EB] hover:border-blue-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <span className="ml-1 text-[11px] text-[#697180] tabular-nums">{x.sort_order}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCourse(x)}
                            title="编辑课程类目"
                            className="p-1.5 rounded border border-[#E1E5EB] bg-white text-[#697180] hover:text-[#2563EB] hover:border-blue-200 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCourse(x)}
                            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                              x.is_active
                                ? "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                : "bg-[#E8EEFF] text-[#2563EB] border-blue-200 hover:bg-blue-100"
                            }`}
                          >
                            {x.is_active ? "停用" : "启用"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(x)}
                            title="删除课程类目"
                            className="p-1.5 rounded border border-[#E1E5EB] bg-white text-[#697180] hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Rooms Table (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E1E5EB] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-semibold text-[#292D35]">场馆教室 ({rooms.length})</h2>
            </div>
            <span className="text-xs text-[#697180]">场地容量</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFBFD] border-b border-[#E1E5EB] text-[#697180] text-xs font-medium">
                <tr>
                  <th className="px-5 py-3">教室名称</th>
                  <th className="px-5 py-3">容纳席位</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5EB]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#697180]">
                      加载中...
                    </td>
                  </tr>
                ) : rooms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#697180]">
                      暂无教室记录
                    </td>
                  </tr>
                ) : (
                  rooms.map((x) => (
                    <tr key={x.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5 font-medium text-[#292D35] text-sm">
                        {x.name}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#697180] tabular-nums">
                        <span className="text-[#292D35] font-semibold text-sm">{x.capacity}</span> 人
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            x.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {x.is_active ? "已启用" : "已停用"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => toggleRoom(x)}
                          className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                            x.is_active
                              ? "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                              : "bg-[#E8EEFF] text-[#2563EB] border-blue-200 hover:bg-blue-100"
                          }`}
                        >
                          {x.is_active ? "停用" : "启用"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add Course */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">新增课程类目</h3>
            <p className="text-xs text-[#697180] mt-1">设置排课类目名称、课时规格与默认人数。</p>

            <form onSubmit={addCourse} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">
                  英文代码 Key（选填，留空自动生成）
                </label>
                <input
                  type="text"
                  placeholder="pilates"
                  value={c.key}
                  onChange={(e) => setC({ ...c, key: e.target.value.toLowerCase().trim() })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
                />
                <p className="text-[11px] text-[#697180] mt-1">
                  排课内部标识，只能是小写字母、数字、下划线；留空时系统自动生成。
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">课程名称 *</label>
                <input
                  type="text"
                  placeholder="例如：普拉提形体私教"
                  value={c.name}
                  onChange={(e) => setC({ ...c, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">单节课长 (分钟) *</label>
                  <input
                    type="number"
                    value={c.durationMinutes}
                    onChange={(e) => setC({ ...c, durationMinutes: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">默认满载人数 *</label>
                  <input
                    type="number"
                    value={c.defaultCapacity}
                    onChange={(e) => setC({ ...c, defaultCapacity: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EB] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? "正在保存..." : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Room */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">新增教室场地</h3>
            <p className="text-xs text-[#697180] mt-1">设置场馆内部教室名称与最大安全容量。</p>

            <form onSubmit={addRoom} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">教室名称 *</label>
                <input
                  type="text"
                  placeholder="例如：VIP 普拉提大器械室"
                  value={r.name}
                  onChange={(e) => setR({ ...r, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">容纳人数上限 *</label>
                <input
                  type="number"
                  placeholder="10"
                  value={r.capacity}
                  onChange={(e) => setR({ ...r, capacity: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EB] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddRoom(false)}
                  className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? "正在保存..." : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Course */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-[#E1E5EB]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#292D35]">编辑课程类目</h3>
                <p className="text-xs text-[#697180] mt-1">修改名称与规格后立即生效；类目 Key 固定不可修改。</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                title="关闭"
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveEditCourse} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">英文代码 Key（不可修改）</label>
                <input
                  type="text"
                  value={editing.key}
                  readOnly
                  disabled
                  className="w-full px-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg text-[#697180] cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">课程名称 *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">单节课长 (分钟) *</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm({ ...editForm, durationMinutes: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">默认满载人数 *</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.defaultCapacity}
                    onChange={(e) => setEditForm({ ...editForm, defaultCapacity: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">颜色</label>
                  <input
                    type="text"
                    placeholder="#2563EB"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
                  />
                  <p className="text-[11px] text-[#697180] mt-1">用于小程序端课程色块，可留空。</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">排序值</label>
                  <input
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <p className="text-[11px] text-[#697180] mt-1">数值越小越靠前。</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EB] mt-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? "正在保存..." : "保存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Course Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-[#292D35]">确认删除课程类目？</h3>
                <p className="text-xs text-[#697180] mt-1">
                  即将删除「{deleteTarget.name}」。若已有课次或卡种引用该课种，系统会拒绝删除，可改用停用。删除后不可恢复。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={removeCourse}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {saving ? "正在删除..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
