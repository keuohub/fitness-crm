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
} from "lucide-react";

type Course = {
  id: number;
  key: string;
  name: string;
  duration_minutes: number;
  default_capacity: number;
  is_active: number;
};
type Room = { id: number; name: string; capacity: number; is_active: number };

async function jf(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}

export default function AdminCoursesPage() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
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
  const [r, setR] = useState({ name: "", capacity: "10" });

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
    if (!c.key || !c.name) {
      showToast("请填写类目代码与课程名称", "error");
      return;
    }
    setSaving(true);
    try {
      await jf("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...c,
          durationMinutes: Number(c.durationMinutes),
          defaultCapacity: Number(c.defaultCapacity),
          sortOrder: Number(c.sortOrder),
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
            onClick={() => setShowAddCourse(true)}
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
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[#697180]">
                      暂无课程类目
                    </td>
                  </tr>
                ) : (
                  courses.map((x) => (
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
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => toggleCourse(x)}
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
                  英文代码 Key (如 pilates, yoga) *
                </label>
                <input
                  type="text"
                  placeholder="pilates"
                  value={c.key}
                  onChange={(e) => setC({ ...c, key: e.target.value.toLowerCase().trim() })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
                />
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
    </div>
  );
}
