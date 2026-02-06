import { createResource, For, Suspense, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";

const fetchWikiPages = async (projectId: string) => {
  // TODO: API 엔드포인트 구현 필요
  // const res = await api.get(`/project/${projectId}/wiki/pages`);
  // return res.data.data;
  return [];
};

function WikiPageItem(props) {
  const [isExpanded, setIsExpanded] = createSignal(false);

  return (
    <div class="wiki-page-item">
      <div class="wiki-page-header">
        <Show when={props.page.children && props.page.children.length > 0}>
          <button onClick={() => setIsExpanded(!isExpanded())} class="wiki-page-toggle">
            {isExpanded() ? "▼" : "▶"}
          </button>
        </Show>
        <A
          href={`/project/${props.projectId}/wiki/${props.page.id}`}
          class="lnb-item"
          activeClass="active"
        >
          {props.page.title}
        </A>
      </div>
      <Show when={isExpanded() && props.page.children && props.page.children.length > 0}>
        <div class="wiki-page-children">
          <For each={props.page.children}>
            {(child) => <WikiPageItem page={child} projectId={props.projectId} />}
          </For>
        </div>
      </Show>
    </div>
  );
}

function WikiLNB(props) {
  const [pages] = createResource(() => props.projectId, fetchWikiPages);

  return (
    <div>
      <A href={`/project/${props.projectId}/wiki/new`}>
        <button class="lnb-create-button wiki">+ 페이지 생성</button>
      </A>

      <div>
        <h3 class="lnb-section-title">페이지 목록</h3>
        <Suspense fallback={<p class="lnb-loading">로딩 중...</p>}>
          <div class="lnb-list">
            <For
              each={pages()}
              fallback={<p class="lnb-empty">위키 페이지가 없습니다.</p>}
            >
              {(page) => <WikiPageItem page={page} projectId={props.projectId} />}
            </For>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default WikiLNB;
