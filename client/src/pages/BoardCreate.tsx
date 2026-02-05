import { createSignal } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import api from "../lib/axios";

export default function BoardCreate() {
  const params = useParams(); // URL에서 projectId 추출 가능하도록 구성
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name()) return;

    setLoading(true);
    try {
      // 보드 생성 API 호출
      await api.post("/board", {
        name: name(),
        project_id: params.projectId, // URL 파라미터에서 가져온 ID
        type: "KANBAN",
      });

      alert("보드가 생성되었습니다!");
      navigate(`/project/${params.projectId}`); // 프로젝트 상세 페이지로 이동
    } catch (err: any) {
      alert(err.response?.data?.message || "보드 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        "max-width": "500px",
        margin: "40px auto",
        padding: "20px",
        border: "1px solid #eee",
        "border-radius": "10px",
      }}
    >
      <h3>📋 새 보드 만들기</h3>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", "flex-direction": "column", gap: "15px" }}
      >
        <div>
          <label style={{ display: "block", "margin-bottom": "5px" }}>보드 이름</label>
          <input
            type="text"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="예: 개발 백로그, 업무 자동화 보드"
            required
            style={{ width: "100%", padding: "10px", "box-sizing": "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", "justify-content": "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ padding: "10px 20px", background: "#f0f0f0", border: "none" }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading()}
            style={{
              padding: "10px 20px",
              background: loading() ? "#ccc" : "#4A90E2",
              color: "white",
              border: "none",
            }}
          >
            {loading() ? "생성 중..." : "보드 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
