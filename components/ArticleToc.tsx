export default function ArticleToc({
  headings,
}: {
  headings: { id: string; text: string; level: number }[];
}) {
  if (headings.length < 3) return null;
  const topLevel = Math.min(...headings.map((heading) => heading.level));
  return (
    <nav className="article-toc" aria-labelledby="article-toc-heading">
      <h2 id="article-toc-heading">On this page</h2>
      <ol>
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={heading.level > topLevel ? "toc-subheading" : undefined}
          >
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
