import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../lib/axios";

export default function Signup() {
  const [form, setForm] = createSignal({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const updateField = (field) => (e) => {
    setForm({ ...form(), [field]: e.currentTarget.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/member/signup", form());
      alert("회원가입 성공!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "오류 발생");
    }
  };

  return (
    <form onSubmit={handleSubmit} class="auth-container">
      <h2>회원가입</h2>
      <div class="form-group">
        <input 
          type="text" 
          class="form-control"
          placeholder="이름" 
          onInput={updateField("name")} 
          required 
        />
      </div>
      <div class="form-group">
        <input 
          type="email" 
          class="form-control"
          placeholder="이메일" 
          onInput={updateField("email")} 
          required 
        />
      </div>
      <div class="form-group">
        <input 
          type="password" 
          class="form-control"
          placeholder="비밀번호" 
          onInput={updateField("password")} 
          required 
        />
      </div>
      <button type="submit" class="btn btn-primary" style={{ width: "100%" }}>가입하기</button>
    </form>
  );
}
