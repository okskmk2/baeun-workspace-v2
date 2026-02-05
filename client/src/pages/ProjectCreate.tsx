import { createSignal } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import api from "../lib/axios";

export default function ProjectCreate() {
  const params = useParams(); // URL에서 workspaceId 추출
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name()) return;

    setLoading(true);
    try {
      await api.post("/project", {
        name: name(),
        workspace_id: params.workspaceId, // 현재 워크스페이스 ID 포함
        theme_json: { color: "#4A90E2" }, // 기본 테마 예시
      });
      alert("프로젝트가 생성되었습니다!");
      navigate(`/workspace/${params.workspaceId}`); // 대시보드로 돌아가기
    } catch (err) {
      alert(err.response?.data?.message || "생성 실패");
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
      <h3>🚀 새 프로젝트 생성</h3>
      <p style={{ color: "#666" }}>
        워크스페이스에 새로운 작업 공간을 추가합니다.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", "flex-direction": "column", gap: "15px" }}
      >
        <div>
          <label style={{ display: "block", "margin-bottom": "5px" }}>
            프로젝트 이름
          </label>
          <input
            type="text"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="예: 신규 웹사이트 구축, 2024 마케팅"
            required
            style={{
              width: "100%",
              padding: "10px",
              "box-sizing": "border-box",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            "justify-content": "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 20px",
              background: "#f0f0f0",
              border: "none",
              cursor: "pointer",
            }}
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
              cursor: "pointer",
            }}
          >
            {loading() ? "생성 중..." : "프로젝트 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
