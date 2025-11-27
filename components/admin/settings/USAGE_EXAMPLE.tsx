/**
 * Settings Components Usage Example
 *
 * This file demonstrates how to use the reusable settings components
 * to create a consistent settings page with liquid glass design.
 */

'use client';

import { useState } from 'react';
import {
  SettingsHeader,
  SettingsSidebar,
  SettingsSection,
  type SettingsSidebarItem,
} from '@/components/admin/settings';
import {
  Settings2,
  Building2,
  Palette,
  Upload,
  DollarSign,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

// Define your settings sections
const SETTINGS_SECTIONS: SettingsSidebarItem[] = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Basic business details',
    icon: Building2,
    badge: 'Required',
    badgeVariant: 'primary',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Theme and branding',
    icon: Palette,
  },
  {
    id: 'upload',
    title: 'Upload Settings',
    description: 'File upload configuration',
    icon: Upload,
  },
  {
    id: 'pricing',
    title: 'Pricing',
    description: 'Default pricing configuration',
    icon: DollarSign,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Email and alert preferences',
    icon: Bell,
    badge: 'New',
    badgeVariant: 'success',
  },
];

export default function SettingsPageExample() {
  // State for active section
  const [activeSection, setActiveSection] = useState('business');

  // State for form data
  const [formData, setFormData] = useState({
    businessName: 'LookEscolar',
    businessEmail: 'contact@lookescolar.com',
    businessPhone: '+54 11 1234-5678',
    uploadMaxSizeMb: 10,
    uploadMaxConcurrent: 5,
    defaultPriceArs: 500,
    notifyNewOrders: true,
    notifyPayments: true,
  });

  // Saving state per section
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  // Update form data helper
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Save handler for each section
  const handleSave = async (sectionId: string) => {
    setSavingStates((prev) => ({ ...prev, [sectionId]: true }));

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real implementation, you would:
      // const response = await fetch('/api/admin/settings', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });

      toast.success(`${sectionId} settings saved successfully`);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingStates((prev) => ({ ...prev, [sectionId]: false }));
    }
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <SettingsHeader
          title="Settings"
          description="Manage your complete LookEscolar platform experience"
          icon={Settings2}
          badge="Admin"
          badgeVariant="primary"
          actions={
            <button
              onClick={() => toast.info('Quick save not implemented')}
              className="btn-primary"
            >
              Quick Save
            </button>
          }
        />

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <SettingsSidebar
            items={SETTINGS_SECTIONS}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            title="Settings Sections"
          />

          {/* Content Area */}
          <div className="flex-1 space-y-8">
            {/* Business Section */}
            {activeSection === 'business' && (
              <SettingsSection
                id="business"
                title="Business Information"
                description="Configure your business details and contact information"
                icon={Building2}
                onSave={() => handleSave('business')}
                isSaving={savingStates.business}
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) =>
                        updateFormData({ businessName: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      placeholder="Enter your business name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) =>
                        updateFormData({ businessEmail: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) =>
                        updateFormData({ businessPhone: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>
              </SettingsSection>
            )}

            {/* Upload Section */}
            {activeSection === 'upload' && (
              <SettingsSection
                id="upload"
                title="Upload Settings"
                description="Configure file upload limits and behavior"
                icon={Upload}
                onSave={() => handleSave('upload')}
                isSaving={savingStates.upload}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Max File Size (MB)
                    </label>
                    <input
                      type="number"
                      value={formData.uploadMaxSizeMb}
                      onChange={(e) =>
                        updateFormData({
                          uploadMaxSizeMb: Number(e.target.value),
                        })
                      }
                      min="1"
                      max="50"
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Max Concurrent Uploads
                    </label>
                    <input
                      type="number"
                      value={formData.uploadMaxConcurrent}
                      onChange={(e) =>
                        updateFormData({
                          uploadMaxConcurrent: Number(e.target.value),
                        })
                      }
                      min="1"
                      max="10"
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                    />
                  </div>
                </div>
              </SettingsSection>
            )}

            {/* Pricing Section */}
            {activeSection === 'pricing' && (
              <SettingsSection
                id="pricing"
                title="Default Pricing"
                description="Set default prices for your photos and packages"
                icon={DollarSign}
                onSave={() => handleSave('pricing')}
                isSaving={savingStates.pricing}
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Default Photo Price (ARS)
                    </label>
                    <input
                      type="number"
                      value={formData.defaultPriceArs}
                      onChange={(e) =>
                        updateFormData({
                          defaultPriceArs: Number(e.target.value),
                        })
                      }
                      min="0"
                      step="50"
                      className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                    />
                  </div>
                </div>
              </SettingsSection>
            )}

            {/* Notifications Section (Collapsible Example) */}
            {activeSection === 'notifications' && (
              <SettingsSection
                id="notifications"
                title="Notification Preferences"
                description="Configure email and alert notifications"
                icon={Bell}
                collapsible={true}
                defaultCollapsed={false}
                onSave={() => handleSave('notifications')}
                isSaving={savingStates.notifications}
              >
                <div className="space-y-4">
                  {[
                    {
                      id: 'new-orders',
                      label: 'New Orders',
                      desc: 'Email when a new order is placed',
                      checked: formData.notifyNewOrders,
                      key: 'notifyNewOrders' as const,
                    },
                    {
                      id: 'payments',
                      label: 'Payment Confirmations',
                      desc: 'Email when a payment is confirmed',
                      checked: formData.notifyPayments,
                      key: 'notifyPayments' as const,
                    },
                  ].map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm transition-all hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {notification.label}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {notification.desc}
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={notification.checked}
                          onChange={(e) =>
                            updateFormData({
                              [notification.key]: e.target.checked,
                            })
                          }
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:bg-white/10 dark:peer-focus:ring-blue-800"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}

            {/* Appearance Section (No Save Button Example) */}
            {activeSection === 'appearance' && (
              <SettingsSection
                id="appearance"
                title="Appearance"
                description="Customize the look and feel of your admin panel"
                icon={Palette}
                hasSaveButton={false}
              >
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white/50 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                    <h4 className="mb-4 font-semibold text-slate-900 dark:text-white">
                      Theme Settings
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Theme settings are applied automatically. No save required.
                    </p>
                  </div>
                </div>
              </SettingsSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
