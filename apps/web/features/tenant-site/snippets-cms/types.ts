export interface BlockNodeJson {
  id: string;
  kind: string;
  props: unknown;
  children?: BlockNodeJson[];
}

export interface SnippetItem {
  id: string;
  slug: string;
  name: string;
  type: "html" | "block";
  content: BlockNodeJson[] | string;
  uses: number;
  updatedAt: string;
  createdAt: string;
}

export interface SnippetDetail extends SnippetItem {
  description?: string;
}
