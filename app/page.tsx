export default function Home() {
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Select a course from the sidebar to view course navigation and
          assignment tabs.
        </p>
      </div>
    </section>
  );
}
