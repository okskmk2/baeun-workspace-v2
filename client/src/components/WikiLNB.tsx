import { createResource, For, Suspense, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";
import { getCurrentProjectId } from "../store/appStore";

const fetchWikiPages = async (projectId: string) => {
  try {
    const res = await api.get(`/project/${projectId}/pages`);
    return res.data.data;
  } catch (err) {
    console.error("fetchWikiPages error", err);
    return [];
  }
};

interface WikiPage {
  id: string;
  title: string;
  children?: WikiPage[];
}

interface WikiPageItemProps {
  page: WikiPage;
}

function WikiPageItem(props: WikiPageItemProps) {
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
          href={`/project/${getCurrentProjectId()}/wiki/${props.page.id}`}
          class="lnb-item"
          activeClass="active"
        >
          {props.page.title}
        </A>
      </div>
      <Show when={isExpanded() && props.page.children && props.page.children.length > 0}>
        <div class="wiki-page-children">
          <For each={props.page.children}>{(child) => <WikiPageItem page={child} />}</For>
        </div>
      </Show>
    </div>
  );
}

function WikiLNB() {
  const [pages] = createResource(() => getCurrentProjectId(), fetchWikiPages);

  return (
    <div>
      <A href={`/project/${getCurrentProjectId()}/wiki/new`}>
        <button class="lnb-create-button wiki">+ 페이지 생성</button>
      </A>

      <div>
        <h3 class="lnb-section-title">페이지 목록</h3>
        <Suspense fallback={<p class="lnb-loading">로딩 중...</p>}>
          <div class="lnb-list">
            <For each={pages()} fallback={<p class="lnb-empty">위키 페이지가 없습니다.</p>}>
              {(page) => <WikiPageItem page={page} />}
            </For>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default WikiLNB;
