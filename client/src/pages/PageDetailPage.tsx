import { createResource, createSignal } from "solid-js";
import { A, useParams } from "@solidjs/router";
import api from "../lib/axios";
import { getCurrentProjectId } from "../store/appStore";
import type { Page } from "../lib/types";

const fetchPage = async (params: { projectId?: string; pageId?: string }): Promise<Page | null> => {
  const { projectId, pageId } = params;
  try {
    const res = await api.get(`/project/${projectId}/pages/${pageId}`);
    return res.data.data as Page;
  } catch (err) {
    console.error("fetchPage error", err);
    return null;
  }
};

const fetchPages = async (projectId: string): Promise<Page[]> => {
  try {
    const res = await api.get(`/project/${projectId}/pages`);
    return (res.data.data || []) as Page[];
  } catch (err) {
    console.error("fetchPages error", err);
    return [];
  }
};

function buildMap(nodes, map = {}) {
  for (const n of nodes) {
    map[n.id] = n;
    if (n.children && n.children.length > 0) buildMap(n.children, map);
  }
  return map;
}

export default function PageDetailPage() {
  const params = useParams();
  const [page] = createResource<Page | null, { projectId?: string; pageId?: string }>(() => ({ projectId: getCurrentProjectId(), pageId: params.pageId }), fetchPage);
  const [pages] = createResource<Page[], string | undefined>(() => getCurrentProjectId(), fetchPages);

  const map = buildMap(pages() || []);

  // build breadcrumb by following parent_id
  const breadcrumb = [];
  let cur = page();
  while (cur) {
    breadcrumb.unshift(cur);
    if (!cur.parent_id) break;
    cur = map[cur.parent_id];
  }

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <A href={`/project/${getCurrentProjectId()}`} class="back-link">← 프로젝트로 돌아가기</A>
          <h1 class="page-header-info">{page() ? page().title : "로딩..."}</h1>
        </div>
      </header>

      <section>
        <div class="breadcrumbs">
          {breadcrumb.length ? (
            breadcrumb.map((b) => (
              <A href={`/project/${getCurrentProjectId()}/wiki/${b.id}`} class="breadcrumb-link">{b.title}</A>
            ))
          ) : (
            <span>없음</span>
          )}
        </div>

        <div class="page-content">
          {page() ? (
            <div innerHTML={page().content || ""} />
          ) : (
            <p>로딩 중...</p>
          )}
        </div>
      </section>
    </div>
  );
}
