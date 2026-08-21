import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

export const markdownRemarkPlugins = [remarkGfm];
export const markdownRehypePlugins = [rehypeSanitize];
