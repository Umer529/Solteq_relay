export function WorkspaceSkeleton() {
  return (
    <main className="workspace-shell" aria-busy="true" aria-label="Loading workspace">
      <aside className="workspace-sidebar skeleton-sidebar" aria-hidden="true">
        <span className="skeleton skeleton-brand" />
        <span className="skeleton skeleton-switcher" />
        <span className="skeleton skeleton-label" />
        {Array.from({ length: 4 }, (_, index) => <span className="skeleton skeleton-project" key={index} />)}
      </aside>
      <section className="project-workspace skeleton-workspace" id="main-content" aria-hidden="true">
        <header className="project-header"><span className="skeleton skeleton-title" /></header>
        <div className="project-tabs">
          {Array.from({ length: 4 }, (_, index) => <span className="skeleton skeleton-tab" key={index} />)}
        </div>
        <div className="project-content skeleton-content">
          <span className="skeleton skeleton-summary" />
          <div className="skeleton-columns">
            {Array.from({ length: 3 }, (_, column) => (
              <div className="skeleton-column" key={column}>
                <span className="skeleton skeleton-column-title" />
                {Array.from({ length: 3 }, (__, card) => <span className="skeleton skeleton-card" key={card} />)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
