# Settings Components

Reusable settings UI components with liquid glass design and modern gradients for admin settings pages.

## Components

### SettingsSection

Main section wrapper with liquid glass design, collapsible support, and integrated save functionality.

**Features:**
- Liquid glass morphism design with modern gradients
- Optional collapsible sections
- Integrated save button with loading states
- Icon support with animated backgrounds
- Fully typed with TypeScript

**Example:**

```tsx
import { SettingsSection } from '@/components/admin/settings';
import { Building2 } from 'lucide-react';

function MySettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Save logic here
    await saveSettings();
    setIsSaving(false);
  };

  return (
    <SettingsSection
      id="business"
      title="Business Information"
      description="Basic details about your school photography business"
      icon={Building2}
      hasSaveButton={true}
      onSave={handleSave}
      isSaving={isSaving}
    >
      {/* Your form fields here */}
      <div className="space-y-4">
        <input type="text" placeholder="Business name" />
        <input type="email" placeholder="Email" />
      </div>
    </SettingsSection>
  );
}
```

### SettingsSidebar

Navigation sidebar with gradient active states and badge support.

**Features:**
- Modern gradient active states
- Badge support (New, Beta, etc.)
- Fully accessible with ARIA labels
- Responsive design
- Customizable items and sections

**Example:**

```tsx
import { SettingsSidebar } from '@/components/admin/settings';
import { Settings2, Building2, Palette } from 'lucide-react';

function MySettingsLayout() {
  const [activeSection, setActiveSection] = useState('business');

  const sections = [
    {
      id: 'business',
      title: 'Business Info',
      description: 'Basic business details',
      icon: Building2,
      badge: 'New',
      badgeVariant: 'primary' as const,
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Theme and branding',
      icon: Palette,
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'System settings',
      icon: Settings2,
      badge: 'Beta',
      badgeVariant: 'warning' as const,
    },
  ];

  return (
    <div className="flex gap-8">
      <SettingsSidebar
        items={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        title="Settings"
      />
      {/* Your content here */}
    </div>
  );
}
```

### SettingsHeader

Page header with gradient backgrounds and badge support.

**Features:**
- Modern gradient backgrounds with blur effects
- Icon support with animated hover states
- Badge support for labels (Admin, Pro, etc.)
- Optional action buttons
- Decorative background elements

**Example:**

```tsx
import { SettingsHeader } from '@/components/admin/settings';
import { Settings2 } from 'lucide-react';

function MySettingsPage() {
  return (
    <div className="space-y-8">
      <SettingsHeader
        title="Settings"
        description="Manage your complete LookEscolar platform experience"
        icon={Settings2}
        badge="Admin"
        badgeVariant="primary"
        actions={
          <button className="btn-primary">
            Save All
          </button>
        }
      />
      {/* Your content here */}
    </div>
  );
}
```

## Complete Example

Here's a complete settings page using all components together:

```tsx
'use client';

import { useState } from 'react';
import {
  SettingsHeader,
  SettingsSidebar,
  SettingsSection
} from '@/components/admin/settings';
import { Settings2, Building2, Palette, Upload } from 'lucide-react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('business');
  const [isSaving, setIsSaving] = useState(false);

  const sections = [
    { id: 'business', title: 'Business', description: 'Business info', icon: Building2 },
    { id: 'appearance', title: 'Appearance', description: 'Theme settings', icon: Palette },
    { id: 'upload', title: 'Upload', description: 'File settings', icon: Upload },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <SettingsHeader
          title="Settings"
          description="Manage your platform configuration"
          icon={Settings2}
          badge="Admin"
        />

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <SettingsSidebar
            items={sections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          {/* Content */}
          <div className="flex-1">
            {activeSection === 'business' && (
              <SettingsSection
                id="business"
                title="Business Information"
                description="Configure your business details"
                icon={Building2}
                onSave={handleSave}
                isSaving={isSaving}
              >
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Business name"
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3"
                  />
                </div>
              </SettingsSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Props Reference

### SettingsSection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Section identifier |
| `title` | `string` | **required** | Section title |
| `description` | `string` | `undefined` | Section description |
| `icon` | `LucideIcon` | `undefined` | Icon component |
| `children` | `ReactNode` | **required** | Section content |
| `collapsible` | `boolean` | `false` | Whether section is collapsible |
| `defaultCollapsed` | `boolean` | `false` | Default collapsed state |
| `hasSaveButton` | `boolean` | `true` | Show save button |
| `onSave` | `() => void \| Promise<void>` | `undefined` | Save handler |
| `isSaving` | `boolean` | `false` | Save loading state |
| `isSaveDisabled` | `boolean` | `false` | Disable save button |
| `saveButtonText` | `string` | `'Guardar'` | Save button text |
| `className` | `string` | `undefined` | Additional CSS classes |

### SettingsSidebar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `SettingsSidebarItem[]` | `SECTIONS` | Sidebar items |
| `activeSection` | `string` | **required** | Active section ID |
| `onSectionChange` | `(id: string) => void` | **required** | Section change handler |
| `title` | `string` | `'Secciones'` | Sidebar title |
| `className` | `string` | `undefined` | Additional CSS classes |

### SettingsHeader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | Main title |
| `description` | `string` | `undefined` | Subtitle/description |
| `icon` | `LucideIcon` | `undefined` | Icon component |
| `badge` | `string` | `undefined` | Badge text |
| `badgeVariant` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'primary'` | Badge color |
| `actions` | `ReactNode` | `undefined` | Action buttons |
| `className` | `string` | `undefined` | Additional CSS classes |

## Design Patterns

### Liquid Glass Design

All components use the liquid glass morphism design system:
- `liquid-glass-intense` class for main containers
- Gradient backgrounds with blur effects
- Border with subtle transparency
- Shadow layers for depth

### Color Variants

Badge colors follow a consistent palette:
- `default`: Slate
- `primary`: Blue
- `success`: Green
- `warning`: Amber
- `danger`: Red

### Accessibility

All components include:
- ARIA labels and landmarks
- Semantic HTML structure
- Keyboard navigation support
- Focus indicators
- Screen reader friendly

## TypeScript Support

All components are fully typed with comprehensive TypeScript definitions. Import types as needed:

```tsx
import type {
  SettingsSectionProps,
  SettingsSidebarProps,
  SettingsSidebarItem,
  SettingsHeaderProps,
} from '@/components/admin/settings';
```
