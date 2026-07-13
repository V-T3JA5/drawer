export default function MarkdownBlocks({ blocks }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'h2') {
          return <h2 key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
        }
        if (block.type === 'p') {
          return <p key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
        }
        if (block.type === 'ul') {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={i}>
              {block.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ol>
          );
        }
        return null;
      })}
    </>
  );
}
