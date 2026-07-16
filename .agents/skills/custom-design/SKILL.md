# Design Skill: System-First Color & UI Consistency Fixes

## Purpose

Fix basic color, contrast, and state problems in the UI without inventing a new visual style.

The goal is to make the current design system usable, readable, and consistent while preserving the existing product identity, layout, spacing, typography, and component direction.

## Core Rule

Do not redesign the app from scratch.

Use the project’s current design system, Tailwind tokens, CSS variables, and existing component patterns first. Only adjust colors, contrast, hover states, active states, disabled states, and readability issues when they are broken or inconsistent.

## Priority

Prefer using the existing `shadcn/ui` setup as soon as possible.

Before creating custom UI patterns, check whether the project already has a shadcn component that should be used instead, such as:

- `Sidebar`
- `Button`
- `Card`
- `Dropdown Menu`
- `Separator`
- `Tooltip`
- `Avatar`
- `Navigation Menu`

If a shadcn component exists and fits the use case, use it or align the custom component with its styling conventions.

## Do Not Invent Styles

Avoid introducing random new colors, gradients, shadows, border radii, or spacing values.

Do not create one-off Tailwind colors like:

```tsx
bg-[#151515]
text-[#1f1f1f]
hover:bg-[#2b2b2b]
````

unless the project already uses that exact value as part of the design system.

Prefer semantic design tokens such as:

```tsx
bg-background
text-foreground
text-muted-foreground
bg-primary
text-primary-foreground
bg-accent
text-accent-foreground
border-border
bg-card
text-card-foreground
```

For sidebar-specific styling, prefer existing sidebar tokens if available:

```tsx
bg-sidebar
text-sidebar-foreground
bg-sidebar-accent
text-sidebar-accent-foreground
text-sidebar-muted-foreground
```

## Current Problem to Fix

The sidebar has poor dark-mode contrast.

Visible issues:

1. Some inactive navigation labels are almost invisible.
2. Icons and text use colors that are too close to the sidebar background.
3. Active and selected states are inconsistent.
4. The support card is readable, but it does not feel fully integrated with the sidebar system.
5. Settings and Sign Out at the bottom are too dark and look disabled.
6. The UI feels like some colors were manually guessed instead of coming from the design system.

## Expected Behavior

Navigation items should have clear visual states:

### Default item

Readable but not dominant.

```tsx
text-muted-foreground
hover:text-foreground
hover:bg-accent
```

### Active item

Clearly selected.

```tsx
bg-primary
text-primary-foreground
```

### Secondary active or hovered item

Visible but less strong than the main active item.

```tsx
bg-accent
text-accent-foreground
```

### Disabled item

Only use disabled styling if the item is actually disabled.

```tsx
opacity-50
pointer-events-none
```

Do not make normal navigation items look disabled.

## Sidebar Design Rules

For dark sidebar layouts:

* Use one consistent sidebar background.
* Ensure all normal text passes readable contrast.
* Avoid black text on dark backgrounds.
* Icons should follow the same color as their labels unless intentionally muted.
* Active item must be obvious.
* Hover state must be visible.
* Bottom actions like Settings and Sign Out must remain readable.
* Support card should use `bg-card`, `text-card-foreground`, and shadcn `Button` styling where possible.

## Recommended Sidebar Class Pattern

Use this kind of structure:

```tsx
const navItemBase =
  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors";

const navItemDefault =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

const navItemActive =
  "bg-primary text-primary-foreground";

const navItemSecondaryActive =
  "bg-accent text-accent-foreground";
```

Example:

```tsx
<Link
  href={item.href}
  className={cn(
    navItemBase,
    isActive ? navItemActive : navItemDefault
  )}
>
  <item.icon className="h-4 w-4" />
  <span>{item.label}</span>
</Link>
```

## Support Card Rule

Use shadcn-style card and button classes:

```tsx
<div className="rounded-xl bg-card p-4 text-card-foreground">
  <p className="text-sm font-semibold">Need Assistance?</p>

  <Button className="mt-3 w-full rounded-full" variant="secondary">
    Request Support
  </Button>
</div>
```

Do not manually style this with random white buttons unless it already matches the system.

## Color Fix Checklist

Before finishing, verify:

* All sidebar labels are readable.
* All icons are readable.
* Active page is visually clear.
* Hover state is visible.
* Settings and Sign Out are not accidentally hidden.
* No normal item looks disabled.
* No random new colors were introduced.
* shadcn/ui components are used where appropriate.
* The existing design system is respected.

## Final Instruction

Fix the color and contrast problems using the current system design. Do not redesign the sidebar. Do not invent a new style. Prefer shadcn/ui components and semantic Tailwind tokens as early as possible.
