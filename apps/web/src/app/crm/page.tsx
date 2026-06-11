"use client";

import { Badge, Button, Card, DataTable, FormField, Input, MetricCard, PageHeader, Select, type DataColumn } from "@tnvios/ui";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Session = { accessToken: string; tenantId?: string; organizationId?: string };
type Customer = { id: string; name: string; email: string | null; industry: string | null; status: string };
type Lead = { id: string; name: string; company: string | null; estimatedValue: number; status: string };
type Opportunity = { id: string; name: string; amount: number; probability: number; stage: string; customerId: string };
const issuer = "http://localhost:8080/realms/tnvios";
const sessionKey = "tnvios-crm-session";
const navigation: readonly { href: string; label: string; active?: boolean }[] = [
  { href: "/", label: "Workspace" },
  { active: true, href: "/crm", label: "CRM" },
] as const;
const customerColumns: readonly DataColumn<Customer>[] = [
  { key: "name", label: "Customer", render: (row) => <strong>{row.name}</strong> },
  { key: "email", label: "Email", render: (row) => row.email ?? "—" },
  { key: "industry", label: "Industry", render: (row) => row.industry ?? "—" },
  { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
];
const leadColumns: readonly DataColumn<Lead>[] = [
  { key: "name", label: "Lead", render: (row) => <strong>{row.name}</strong> },
  { key: "company", label: "Company", render: (row) => row.company ?? "—" },
  { key: "estimatedValue", label: "Estimated value", render: (row) => money(row.estimatedValue) },
  { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
];
const opportunityColumns: readonly DataColumn<Opportunity>[] = [
  { key: "name", label: "Opportunity", render: (row) => <strong>{row.name}</strong> },
  { key: "amount", label: "Amount", render: (row) => money(row.amount) },
  { key: "probability", label: "Probability", render: (row) => `${row.probability}%` },
  { key: "stage", label: "Stage", render: (row) => <Badge>{row.stage}</Badge> },
];

export default function CrmPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [message, setMessage] = useState("Sign in to connect this browser to your local CRM.");
  const [busy, setBusy] = useState(false);

  const saveSession = useCallback((next: Session | null) => {
    setSession(next);
    if (next) localStorage.setItem(sessionKey, JSON.stringify(next));
    else localStorage.removeItem(sessionKey);
  }, []);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!session) throw new Error("Sign in first.");
    const response = await fetch(`/api/crm/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(session.tenantId ? { "X-Tenant-ID": session.tenantId } : {}),
        ...(session.organizationId ? { "X-Organization-ID": session.organizationId } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const text = await response.text();
    let result: { data?: unknown; message?: string; code?: string };
    try {
      result = JSON.parse(text) as typeof result;
    } catch {
      throw new Error(text || `The server returned an empty response (${response.status}).`);
    }
    if (!response.ok) throw new Error(result.message ?? result.code ?? `Request failed (${response.status}).`);
    return result.data;
  }, [session]);
  const load = useCallback(async () => {
    if (!session?.tenantId || !session.organizationId) return;
    setBusy(true);
    try {
      const [nextCustomers, nextLeads, nextOpportunities] = await Promise.all([
        request("customers"), request("leads"), request("opportunities"),
      ]);
      setCustomers(nextCustomers as Customer[]);
      setLeads(nextLeads as Lead[]);
      setOpportunities(nextOpportunities as Opportunity[]);
      setMessage("CRM is connected and ready.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load CRM."); }
    finally { setBusy(false); }
  }, [request, session?.organizationId, session?.tenantId]);

  useEffect(() => {
    const stored = localStorage.getItem(sessionKey);
    if (stored) setSession(JSON.parse(stored) as Session);
    void completeLogin(saveSession, setMessage);
  }, [saveSession]);
  useEffect(() => { void load(); }, [load]);

  async function bootstrap() {
    if (!session) return;
    setBusy(true);
    try {
      const data = await request("demo/bootstrap", { method: "POST" }) as { tenantId: string; organizationId: string };
      saveSession({ ...session, ...data });
      setMessage("Local CRM workspace created. Loading sales data...");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Setup failed."); }
    finally { setBusy(false); }
  }
  async function create(path: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      setMessage("Saved successfully.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden min-h-screen bg-sidebar p-4 text-sidebar-foreground lg:block">
        <a className="mb-8 block text-xl font-black" href="/">Tnvios</a>
        <nav className="grid gap-2">{navigation.map((item) => <a className={`rounded-lg px-3 py-2.5 text-sm ${item.active ? "bg-sidebar-accent" : "text-sidebar-muted"}`} href={item.href} key={item.label}>{item.label}</a>)}</nav>
      </aside>
      <main className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 lg:p-8">
        <PageHeader
          actions={session ? <><Button disabled={busy} onClick={() => void bootstrap()} variant="outline">Set up local CRM</Button><Button onClick={() => saveSession(null)} variant="ghost">Sign out</Button></> : <Button onClick={() => void beginLogin()}>Sign in with Keycloak</Button>}
          description="Manage customers, leads, and the sales pipeline from the browser."
          eyebrow="First enterprise module"
          title="CRM workspace"
        />
        <Card className="mb-6 flex items-center justify-between gap-4 p-4">
          <div><strong className="text-sm">Connection status</strong><p className="mt-1 text-sm text-muted-foreground">{message}</p></div>
          <Badge>{session?.organizationId ? "Connected" : session ? "Setup required" : "Signed out"}</Badge>
        </Card>
        {!session?.organizationId ? (
          <Card className="grid min-h-80 place-items-center p-8 text-center">
            <div className="max-w-lg"><h2 className="text-2xl font-bold">{session ? "Create your local CRM workspace" : "Sign in to CRM"}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{session ? "Use the local setup button to create your demo organization, membership, and CRM permissions." : "Keycloak opens in the browser and returns you here after login."}</p><Button className="mt-6" disabled={busy} onClick={() => void (session ? bootstrap() : beginLogin())}>{session ? "Set up local CRM" : "Sign in with Keycloak"}</Button></div>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <MetricCard detail="accounts" label="Customers" trend="Active" value={String(customers.length)} />
              <MetricCard detail="pipeline entries" label="Leads" trend="Open" value={String(leads.length)} />
              <MetricCard detail={money(opportunities.reduce((sum, item) => sum + Number(item.amount), 0))} label="Pipeline value" trend="Forecast" value={String(opportunities.length)} />
            </section>
            <section className="mt-8 grid gap-4 xl:grid-cols-3">
              <CreatePanel title="Add customer" fields={[["name", "Customer name"], ["email", "Email"], ["industry", "Industry"]]} onCreate={(body) => create("customers", body)} />
              <CreatePanel title="Add lead" fields={[["name", "Lead name"], ["company", "Company"], ["estimatedValue", "Estimated value", "number"]]} onCreate={(body) => create("leads", body)} />
              <OpportunityPanel customers={customers} onCreate={(body) => create("opportunities", body)} />
            </section>
            <CrmTable columns={customerColumns} rows={customers} title="Customers" />
            <CrmTable columns={leadColumns} rows={leads} title="Leads" />
            <CrmTable columns={opportunityColumns} rows={opportunities} title="Opportunities" />
          </>
        )}
      </main>
    </div>
  );
}

function CreatePanel({ fields, onCreate, title }: { fields: readonly (readonly [string, string, string?])[]; onCreate(body: Record<string, unknown>): Promise<void>; title: string }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const body = Object.fromEntries(fields.map(([name,, type]) => [name, type === "number" ? Number(data.get(name)) : data.get(name)])); await onCreate(body); event.currentTarget.reset(); }
  return <Card className="p-5"><h2 className="font-semibold">{title}</h2><form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}>{fields.map(([name, label, type]) => <FormField key={name} label={label}><Input name={name} required={name === "name"} type={type ?? "text"} /></FormField>)}<Button type="submit">Save</Button></form></Card>;
}
function OpportunityPanel({ customers, onCreate }: { customers: Customer[]; onCreate(body: Record<string, unknown>): Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await onCreate({ customerId: data.get("customerId"), name: data.get("name"), amount: Number(data.get("amount")), probability: Number(data.get("probability")) }); event.currentTarget.reset(); }
  return <Card className="p-5"><h2 className="font-semibold">Add opportunity</h2><form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}><FormField label="Customer"><Select name="customerId" required><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></FormField><FormField label="Opportunity name"><Input name="name" required /></FormField><div className="grid grid-cols-2 gap-3"><FormField label="Amount"><Input min="0" name="amount" required type="number" /></FormField><FormField label="Probability"><Input max="100" min="0" name="probability" type="number" /></FormField></div><Button disabled={!customers.length} type="submit">Save</Button></form></Card>;
}
function CrmTable<Row extends { id: string }>({ columns, rows, title }: { columns: readonly DataColumn<Row>[]; rows: Row[]; title: string }) { return <section className="mt-8"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{rows.length ? <DataTable columns={columns} rows={rows} /> : <Card className="p-8 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet.</Card>}</section>; }
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
function base64Url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
async function beginLogin() { const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48))); const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)))); const state = crypto.randomUUID(); sessionStorage.setItem("crm-pkce-verifier", verifier); sessionStorage.setItem("crm-pkce-state", state); const url = new URL(`${issuer}/protocol/openid-connect/auth`); url.search = new URLSearchParams({ client_id: "tnvios-web", redirect_uri: `${location.origin}/crm`, response_type: "code", scope: "openid email profile", code_challenge: challenge, code_challenge_method: "S256", state }).toString(); location.assign(url); }
async function completeLogin(save: (session: Session) => void, message: (value: string) => void) { const params = new URLSearchParams(location.search); const code = params.get("code"); if (!code) return; if (params.get("state") !== sessionStorage.getItem("crm-pkce-state")) { message("Login state validation failed."); return; } const response = await fetch(`${issuer}/protocol/openid-connect/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: "tnvios-web", grant_type: "authorization_code", code, redirect_uri: `${location.origin}/crm`, code_verifier: sessionStorage.getItem("crm-pkce-verifier") ?? "" }) }); const token = await response.json() as { access_token?: string }; if (!token.access_token) { message("Keycloak login failed."); return; } save({ accessToken: token.access_token }); history.replaceState({}, "", "/crm"); message("Signed in. Set up your local CRM workspace."); }
