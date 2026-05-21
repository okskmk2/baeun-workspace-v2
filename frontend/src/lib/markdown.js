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
  openLinksInNewTab = true,
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

  const defaultLinkOpen =
    markdown.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  const removeAttr = (token, name) => {
    const attrIndex = token.attrIndex(name);
    if (attrIndex >= 0) {
      token.attrs.splice(attrIndex, 1);
    }
  };

  markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    if (openLinksInNewTab) {
      tokens[idx].attrSet("target", "_blank");
      tokens[idx].attrSet("rel", "noopener noreferrer");
    } else {
      removeAttr(tokens[idx], "target");
      removeAttr(tokens[idx], "rel");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return markdown;
};
