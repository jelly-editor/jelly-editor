import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Props {
  value: string;
}

export function MarkdownPreview({ value }: Props) {
  return (
    <div className="h-full overflow-auto">
      <div className="prose prose-invert prose-sm max-w-3xl mx-auto px-8 py-6 prose-pre:p-0 prose-pre:bg-transparent prose-code:text-[0.85em]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {value}
        </ReactMarkdown>
      </div>
    </div>
  );
}
