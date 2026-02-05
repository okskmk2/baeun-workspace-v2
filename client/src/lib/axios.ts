import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true, // 쿠키 기반 인증 필수 설정
});

export default api;
