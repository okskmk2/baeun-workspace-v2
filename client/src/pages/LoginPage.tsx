import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../lib/axios";

export default function LoginPage() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/member/login", {
        email: email(),
        password: password(),
      });
      alert("로그인에 성공했어요.");
      navigate("/profile");
    } catch (err) {
      alert(err.response?.data?.message || "로그인 실패");
    }
  };

  return (
    <form onSubmit={handleLogin} class="auth-container">
      <h2>로그인</h2>
      <div class="form-group">
        <input 
          type="email" 
          class="form-control"
          placeholder="이메일" 
          onInput={(e) => setEmail(e.currentTarget.value)} 
        />
      </div>
      <div class="form-group">
        <input
          type="password"
          class="form-control"
          placeholder="비밀번호"
          onInput={(e) => setPassword(e.currentTarget.value)}
        />
      </div>
      <button type="submit" class="btn btn-primary" style={{ width: "100%" }}>로그인</button>
    </form>
  );
}
