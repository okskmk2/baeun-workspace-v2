import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

export const DEFAULT_MARKDOWN_REPLACEMENTS = [[")**", ")** "]];

const applyReplacements = (content = "", replacements = []) =>
  replacements.reduce(
    (result, [from, to]) => (from ? result.replaceAll(from, to) : result),
    content
  );

export const createMarkdownRenderer = ({
  replacements = DEFAULT_MARKDOWN_REPLACEMENTS,
} = {}) => {
  const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    highlight: (code, language) => {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  });

  if (replacements.length > 0) {
    markdown.core.ruler.before("normalize", "replace-custom-characters", (state) => {
      state.src = applyReplacements(state.src, replacements);
    });
  }

  return markdown;
};
