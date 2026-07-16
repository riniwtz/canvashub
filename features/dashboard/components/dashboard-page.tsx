export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="text-sm font-medium">Upcoming</div>
          <div className="text-2xl font-semibold">8</div>
          <p className="text-sm text-muted-foreground">Assignments queued</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="text-sm font-medium">Courses</div>
          <div className="text-2xl font-semibold">4</div>
          <p className="text-sm text-muted-foreground">Active this term</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <div className="text-sm font-medium">Contacts</div>
          <div className="text-2xl font-semibold">32</div>
          <p className="text-sm text-muted-foreground">Classmates and staff</p>
        </div>
      </div>
      <div className="min-h-80 rounded-lg border bg-muted/50" />
    </section>
  )
}
