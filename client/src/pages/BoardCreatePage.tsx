import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../lib/axios";
import { addBoard } from "../store/boardStore";
import { getCurrentProjectId } from "../store/appStore";

export default function BoardCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name()) return;

    setLoading(true);
    try {
      // 보드 생성 API 호출
      const projectId = getCurrentProjectId();
      const res = await api.post("/board", {
        name: name(),
        project_id: projectId, // URL 파라미터에서 가져온 ID
        type: "KANBAN",
      });

      // store에 새 보드 추가
      const newBoard = res.data.data;
      if (projectId) addBoard(projectId, newBoard);

      alert("보드가 생성되었습니다!");
      navigate(`/project/${projectId}/issue`); // 이슈 메인 화면으로 이동
    } catch (err: any) {
      alert(err.response?.data?.message || "보드 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="page-container" style={{ "max-width": "500px" }}>
      <h3>📋 새 보드 만들기</h3>
      <form onSubmit={handleSubmit}>
        <div class="form-group">
          <label>보드 이름</label>
          <input
            type="text"
            class="form-control"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="예: 개발 백로그, 업무 자동화 보드"
            required
          />
        </div>
        <div class="flex-row gap-md" style={{ "justify-content": "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            class="btn"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading()}
            class="btn btn-primary"
          >
            {loading() ? "생성 중..." : "보드 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
