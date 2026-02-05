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
    <form onSubmit={handleSubmit}>
      <h2>회원가입</h2>
      <input type="text" placeholder="이름" onInput={updateField("name")} required />
      <input type="email" placeholder="이메일" onInput={updateField("email")} required />
      <input type="password" placeholder="비밀번호" onInput={updateField("password")} required />
      <button type="submit">가입하기</button>
    </form>
  );
}
