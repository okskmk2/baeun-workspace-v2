import { createResource, createSignal } from "solid-js";
import { useParams, A } from "@solidjs/router";
import api from "../lib/axios";

const fetchPage = async (params) => {
  const { projectId, pageId } = params;
  try {
    const res = await api.get(`/project/${projectId}/pages/${pageId}`);
    return res.data.data;
  } catch (err) {
    console.error("fetchPage error", err);
    return null;
  }
};

const fetchPages = async (projectId: string) => {
  try {
    const res = await api.get(`/project/${projectId}/pages`);
    return res.data.data || [];
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
  const [page] = createResource(() => ({ projectId: params.projectId, pageId: params.pageId }), fetchPage);
  const [pages] = createResource(() => params.projectId, fetchPages);

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
          <A href={`/project/${params.projectId}`} class="back-link">← 프로젝트로 돌아가기</A>
          <h1 class="page-header-info">{page() ? page().title : "로딩..."}</h1>
        </div>
      </header>

      <section>
        <div class="breadcrumbs">
          {breadcrumb.length ? (
            breadcrumb.map((b) => (
              <A href={`/project/${params.projectId}/wiki/${b.id}`} class="breadcrumb-link">{b.title}</A>
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
