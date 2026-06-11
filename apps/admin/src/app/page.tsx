import {
  AppShell,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogDescription,
  DialogTitle,
  EmptyState,
  MetricCard,
  PageHeader,
  type DataColumn,
} from "@tnvios/ui";

const navigation = [
  { active: true, href: "#overview", icon: "dashboard", label: "Control center" },
  { href: "#organization", icon: "organization", label: "Organizations" },
  { href: "#people", icon: "people", label: "Identity & access" },
  { href: "#security", icon: "security", label: "Security" },
  { href: "#settings", icon: "settings", label: "Settings" },
] as const;
const tenants = [
  { id: "1", name: "Northstar Holdings", plan: "Enterprise", status: "Healthy", users: "1,284" },
  { id: "2", name: "Summit Retail Group", plan: "Growth", status: "Review", users: "468" },
  { id: "3", name: "Atlas Services", plan: "Enterprise", status: "Healthy", users: "892" },
] as const;
const columns: readonly DataColumn<(typeof tenants)[number]>[] = [
  { key: "name", label: "Organization", render: (row) => <strong>{row.name}</strong> },
  { key: "plan", label: "Plan" },
  { key: "users", label: "Users" },
  { key: "status", label: "Posture", render: (row) => <Badge>{row.status}</Badge> },
];

export default function AdminHomePage() {
  return (
    <AppShell navigation={navigation} product="Administration">
      <PageHeader
        actions={
          <Dialog trigger={<Button>Add organization</Button>}>
            <DialogTitle className="text-xl font-bold">Add organization</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              Organization provisioning will connect to onboarding and policy workflows.
            </DialogDescription>
            <div className="mt-6 flex justify-end">
              <Button>Create draft</Button>
            </div>
          </Dialog>
        }
        description="Manage platform health, organization posture, and governed access from one control surface."
        eyebrow="Platform administration"
        title="Control center"
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" id="overview">
        <MetricCard detail="all healthy" label="Organizations" trend="+3" value="42" />
        <MetricCard detail="last 24 hours" label="Active users" trend="+8%" value="8,942" />
        <MetricCard detail="need review" label="Policy findings" trend="4 open" value="17" />
        <MetricCard detail="successful" label="Workflow executions" trend="99.8%" value="18.4k" />
      </section>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Organization posture</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tenant health and administrative readiness.
            </p>
          </div>
          <Button variant="ghost">View directory</Button>
        </div>
        <DataTable columns={columns} rows={tenants} />
      </section>
      <section className="mt-8">
        <EmptyState
          action={<Button variant="outline">Review policy setup</Button>}
          description="Critical identity, authorization, and audit alerts will appear here when detected."
          title="No critical findings"
        />
      </section>
    </AppShell>
  );
}
