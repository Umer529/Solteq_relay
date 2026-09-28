export default function ProjectLoading() {
  return (
    <div className="content-skeleton" aria-busy="true" aria-label="Loading project section">
      <span className="skeleton skeleton-summary" />
      <div className="skeleton-columns" aria-hidden="true">
        {Array.from({ length: 3 }, (_, column) => (
          <div className="skeleton-column" key={column}>
            <span className="skeleton skeleton-column-title" />
            {Array.from({ length: 3 }, (__, card) => <span className="skeleton skeleton-card" key={card} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
