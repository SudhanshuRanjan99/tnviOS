"use client";

import { BrowserDraftStore, defineForm, usePlatformForm } from "@tnvios/forms";
import {
  AppShell,
  AutoSaveIndicator,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogDescription,
  DialogTitle,
  Drawer,
  EmptyState,
  FieldPermissionGuard,
  FormField,
  Input,
  MetricCard,
  PageHeader,
  Select,
  Textarea,
  WorkflowSubmitBar,
  type DataColumn,
} from "@tnvios/ui";
import { z } from "zod";

const workItemSchema = z.object({
  title: z.string().min(3, "Use at least 3 characters."),
  owner: z.string().min(1, "Choose an owner."),
  notes: z.string().max(500, "Keep notes under 500 characters."),
  budget: z.string(),
});
const workItemForm = defineForm({
  key: "operations.work.create",
  module: "operations",
  entity: "work_item",
  mode: "create",
  schema: workItemSchema,
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "owner", label: "Owner", type: "select", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "budget", label: "Budget", type: "number" },
  ],
  autoSave: { enabled: true, debounceMs: 800 },
  workflow: { required: true, submitAction: "submit_for_approval" },
});
const draftStore = new BrowserDraftStore();

const navigation = [
  { active: true, href: "#overview", icon: "dashboard", label: "Overview" },
  { href: "/crm", icon: "people", label: "CRM" },
  { href: "#people", icon: "people", label: "People" },
  { href: "#workflows", icon: "workflow", label: "Workflows" },
  { href: "#organization", icon: "organization", label: "Organization" },
] as const;
const work = [
  {
    id: "1",
    owner: "Maya Chen",
    status: "In review",
    title: "Q3 operating plan",
    updated: "12 min ago",
  },
  {
    id: "2",
    owner: "Arun Shrestha",
    status: "Approved",
    title: "Vendor onboarding",
    updated: "48 min ago",
  },
  {
    id: "3",
    owner: "Nora Williams",
    status: "Draft",
    title: "Customer expansion brief",
    updated: "2 hours ago",
  },
] as const;
const columns: readonly DataColumn<(typeof work)[number]>[] = [
  { key: "title", label: "Work item", render: (row) => <strong>{row.title}</strong> },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
  { key: "updated", label: "Updated" },
];

export default function HomePage() {
  const form = usePlatformForm({
    definition: workItemForm,
    initialValues: { title: "", owner: "", notes: "", budget: "25000" },
    fieldPermissions: {
      title: "editable",
      owner: "editable",
      notes: "editable",
      budget: "masked",
    },
    draftKey: "operations.work.create:new",
    draftStore,
  });

  return (
    <AppShell navigation={navigation} product="Operations">
      <PageHeader
        actions={
          <>
            <Drawer trigger={<Button variant="outline">Open drawer</Button>}>
              <DialogTitle className="text-xl font-bold">Quick actions</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Start governed work without losing context.
              </DialogDescription>
              <div className="mt-6 grid gap-2">
                <Button>Create request</Button>
                <Button variant="outline">Invite teammate</Button>
                <Button variant="outline">Start workflow</Button>
              </div>
            </Drawer>
            <Dialog trigger={<Button>Create work</Button>}>
              <DialogTitle className="text-xl font-bold">Create a work item</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Controlled fields, permissions, drafts, validation, and workflow submission.
              </DialogDescription>
              <div className="mt-6 grid gap-4">
                <FormField error={form.errors.title} label="Title" required>
                  <Input
                    onChange={(event) => form.setValue("title", event.target.value)}
                    placeholder="Quarterly operating plan"
                    value={form.values.title}
                  />
                </FormField>
                <FormField error={form.errors.owner} label="Owner" required>
                  <Select
                    onChange={(event) => form.setValue("owner", event.target.value)}
                    value={form.values.owner}
                  >
                    <option value="">Choose an owner</option>
                    <option value="maya">Maya Chen</option>
                    <option value="arun">Arun Shrestha</option>
                  </Select>
                </FormField>
                <FormField error={form.errors.notes} label="Notes">
                  <Textarea
                    onChange={(event) => form.setValue("notes", event.target.value)}
                    placeholder="Add context for reviewers"
                    value={form.values.notes}
                  />
                </FormField>
                <FormField description="Field permissions mask sensitive values." label="Budget">
                  <FieldPermissionGuard access={form.fieldAccess.budget ?? "hidden"}>
                    <Input disabled value={form.values.budget} />
                  </FieldPermissionGuard>
                </FormField>
                <AutoSaveIndicator isSaving={form.isSaving} status={form.draftStatus} />
                <WorkflowSubmitBar
                  isSubmitting={form.isSubmitting}
                  onSave={() => void form.saveDraft()}
                  onSubmit={() => void form.submit("submit_for_approval")}
                  status={form.draftStatus}
                />
              </div>
            </Dialog>
          </>
        }
        description="A permission-aware view of the work, decisions, and workflows moving across your organization."
        eyebrow="Thursday, June 11"
        title="Good evening, Gomat."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" id="overview">
        <MetricCard detail="this week" label="Open work" trend="+12%" value="128" />
        <MetricCard detail="need attention" label="Pending approvals" trend="8 due" value="24" />
        <MetricCard detail="on-time rate" label="Active workflows" trend="94%" value="37" />
        <MetricCard detail="across teams" label="People online" trend="+6" value="86" />
      </section>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent work</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live operational context across your teams.
            </p>
          </div>
          <Button variant="ghost">View all</Button>
        </div>
        <DataTable columns={columns} rows={work} />
      </section>
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <EmptyState
          action={<Button variant="outline">Configure feed</Button>}
          description="Events, mentions, and milestones will collect here once modules begin publishing activity."
          title="Your activity feed is ready"
        />
        <EmptyState
          action={<Button variant="outline">Explore templates</Button>}
          description="Start with a governed template for approvals, onboarding, or recurring operations."
          title="No personal workflows yet"
        />
      </section>
    </AppShell>
  );
}
