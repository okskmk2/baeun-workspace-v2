import { createResource, createSignal, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../lib/axios";
import { getCurrentProjectId } from "../store/appStore";
import type { Page } from "../lib/types";

const fetchPages = async (projectId: string) => {
  try {
    const res = await api.get(`/project/${projectId}/pages`);
    return res.data.data;
  } catch (err) {
    console.error("fetchPages error", err);
    return [];
  }
};

function flattenPages(nodes, depth = 0, out = []) {
  for (const n of nodes) {
    out.push({ id: n.id, title: n.title, depth });
    if (n.children && n.children.length > 0) {
      flattenPages(n.children, depth + 1, out);
    }
  }
  return out;
}

export default function PageCreatePage() {
  const navigate = useNavigate();
  const [pages] = createResource<Page[], string | undefined>(() => getCurrentProjectId(), fetchPages);

  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [parentId, setParentId] = createSignal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: title(),
        content: content(),
        parent_id: parentId() || null,
      };

      await api.post(`/project/${getCurrentProjectId()}/pages`, payload);
      navigate(`/project/${getCurrentProjectId()}/wiki`);
    } catch (err) {
      console.error("create page error", err);
      alert("페이지 생성에 실패했습니다.");
    }
  };

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <a href={"/project/" + getCurrentProjectId()} class="back-link">← 프로젝트로 돌아가기</a>
          <h1 class="page-header-info">+ 새 페이지 생성</h1>
        </div>
      </header>

      <section>
        <form onSubmit={handleSubmit} class="form">
          <div class="form-group">
            <label>제목</label>
            <input type="text" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} required />
          </div>

          <div class="form-group">
            <label>상위 페이지 (선택)</label>
            <select value={parentId()} onChange={(e) => setParentId(e.currentTarget.value || null)}>
              <option value="">(최상위)</option>
              <For each={flattenPages(pages() || [])}>
                {(p) => (
                  <option value={p.id}>{"-".repeat(p.depth) + " " + p.title}</option>
                )}
              </For>
            </select>
          </div>

          <div class="form-group">
            <label>내용</label>
            <textarea value={content()} onInput={(e) => setContent(e.currentTarget.value)} rows={12} />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">생성</button>
            <button type="button" class="btn" onClick={() => navigate(`/project/${getCurrentProjectId()}/wiki`)}>취소</button>
          </div>
        </form>
      </section>
    </div>
  );
}
