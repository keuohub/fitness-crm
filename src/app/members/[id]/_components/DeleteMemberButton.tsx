"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DeleteMemberButton({ memberId, memberName }: { memberId: number; memberName: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      }
    } catch {
      // 静默
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowConfirm(true)}
        className="text-[#D4736A] border-[#D4736A]/20 hover:bg-[#D4736A]/10 hover:text-[#C0625A]"
      >
        删除会员
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 max-w-sm w-full shadow-lg">
            <h3 className="font-serif text-lg mb-2">确认删除</h3>
            <p className="text-sm text-[#3E2723] mb-6">
              确定要删除会员「{memberName}」吗？此操作不可恢复，所有关联的问卷、训练记录、照片等数据将一并删除。
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)} disabled={deleting} className="rounded-xl">
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-[#D4736A] hover:bg-[#C0625A] text-white border-0 rounded-xl"
              >
                {deleting ? "删除中..." : "确认删除"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
