import type { ContentBlock } from '@/lib/help/types';

export function ArticleBody({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="help-body">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'p':
            return <p className="notice help-p" key={index}>{block.text}</p>;
          case 'list':
            return <ul className="help-list" key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
          case 'steps':
            return <ol className="help-list help-steps" key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>;
          case 'note':
            return <div className="notice-box" key={index}>{block.text}</div>;
          case 'warning':
            return <div className="error-box" role="alert" key={index}>{block.text}</div>;
          case 'confirm':
            return <div className="help-confirm" key={index}><strong>Needs technical confirmation.</strong> {block.text}</div>;
          default:
            return null;
        }
      })}
    </div>
  );
}
