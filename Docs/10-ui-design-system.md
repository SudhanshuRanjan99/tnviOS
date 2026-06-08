# Tnvios UI Design System

## Purpose
This document defines the frontend UI standard for Tnvios.

## Stack

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Radix UI primitives
Tnvios UI Kit
TanStack Query
Zod
Tnvios Platform Form Engine
Tiptap
```

## Core Rule
Modules must import UI from:

```ts
@tnvios/ui
```

Modules must not directly import random shadcn/ui components or create custom duplicated components.

## Design System Structure

```text
packages/ui/
├── primitives/
├── forms/
├── tables/
├── layouts/
├── dashboards/
├── feedback/
├── overlays/
├── navigation/
├── theme/
├── permissions/
├── editor/
└── charts/
```

## Component Categories

### Primitives
- Button
- Input
- Select
- Checkbox
- Radio
- Switch
- Badge
- Avatar
- Separator
- Label

### Layouts
- AppShell
- Sidebar
- TopNav
- ModuleLayout
- PortalLayout
- SettingsLayout
- SplitPane
- PageHeader

### Data Display
- DataTable
- DetailView
- DescriptionList
- Timeline
- ActivityFeed
- KPICard
- StatCard
- ChartCard

### Feedback
- Toast
- Alert
- EmptyState
- LoadingState
- Skeleton
- ErrorState
- SuccessState

### Overlays
- Dialog
- Drawer
- Sheet
- Popover
- Tooltip
- CommandPalette

### Forms
- Form
- FormField
- FieldGroup
- AutoSaveIndicator
- DraftStatus
- ApprovalSubmitBar
- FieldPermissionGuard

### Permissions
- PermissionGate
- FieldGuard
- RecordActionGuard

### Editor
- RichTextEditor
- CommentEditor
- DocumentEditor
- MentionInput

## Theme
Tnvios must support:
- light mode
- dark mode
- accessible contrast
- consistent spacing
- consistent radius
- consistent typography

## Tailwind Usage

Allowed:
- inside `packages/ui`
- for layout composition
- for approved design tokens

Discouraged:
- raw Tailwind styling inside modules
- custom one-off styles
- duplicate button/card/table styles

## Accessibility
Minimum:
- WCAG AA
- keyboard navigation
- focus states
- screen reader labels
- accessible dialogs
- accessible tables
- color contrast support

## Module UI Rule
Every module must feel like the same platform.

CRM, Finance, HR, Projects, Customer Portal, Vendor Portal, and Partner Portal must use the same:
- layout shell
- navigation patterns
- forms
- tables
- activity timeline
- comments
- dialogs
- buttons
- empty states
