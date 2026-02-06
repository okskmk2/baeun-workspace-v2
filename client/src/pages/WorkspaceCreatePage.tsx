import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../lib/axios";

export default function WorkspaceCreatePage() {
  const [name, setName] = createSignal("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/workspace", { name: name() });
      alert("워크스페이스가 생성되었습니다!");
      // 생성 후 해당 워크스페이스 상세 페이지나 목록으로 이동
      navigate("/profile");
    } catch (err) {
      alert(err.response?.data?.message || "생성 실패");
    }
  };

  return (
    <div className="auth-container">
      <h2>새 워크스페이스 만들기</h2>
      <p>함께 일할 팀의 이름을 정해주세요.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            placeholder="워크스페이스 이름 (예: 마케팅팀, 프로젝트A)"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          워크스페이스 생성
        </button>
      </form>
    </div>
  );
}
