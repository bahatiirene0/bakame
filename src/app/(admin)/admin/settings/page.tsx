'use client';

/**
 * Admin Settings Page
 *
 * System configuration and feature toggles
 */

import { useState } from 'react';
import { Save, RefreshCw, Shield, Globe, Zap, Bell } from 'lucide-react';
import { PageHeader } from '../_components';

// Settings sections for organization
interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: typeof Shield;
  settings: Setting[];
}

interface Setting {
  key: string;
  label: string;
  description: string;
  type: 'toggle' | 'number' | 'select';
  value: boolean | number | string;
  options?: { label: string; value: string }[];
}

// Default settings (in production, fetch from database)
const DEFAULT_SECTIONS: SettingSection[] = [
  {
    id: 'rate-limits',
    title: 'Rate Limiting',
    description: 'Control API request limits',
    icon: Zap,
    settings: [
      {
        key: 'rate_limit_auth',
        label: 'Authenticated User Limit',
        description: 'Requests per minute for logged-in users',
        type: 'number',
        value: 100,
      },
      {
        key: 'rate_limit_guest',
        label: 'Guest User Limit',
        description: 'Requests per minute for guest users',
        type: 'number',
        value: 30,
      },
    ],
  },
  {
    id: 'features',
    title: 'Feature Toggles',
    description: 'Enable or disable platform features',
    icon: Globe,
    settings: [
      {
        key: 'feature_voice',
        label: 'Voice Assistant',
        description: 'Enable Hume EVI voice integration',
        type: 'toggle',
        value: true,
      },
      {
        key: 'feature_image_gen',
        label: 'Image Generation',
        description: 'Enable DALL-E image generation',
        type: 'toggle',
        value: true,
      },
      {
        key: 'feature_video_gen',
        label: 'Video Generation',
        description: 'Enable Kling AI video generation',
        type: 'toggle',
        value: true,
      },
      {
        key: 'feature_code_exec',
        label: 'Code Execution',
        description: 'Enable sandboxed code execution',
        type: 'toggle',
        value: true,
      },
      {
        key: 'feature_file_upload',
        label: 'File Uploads',
        description: 'Allow users to upload files',
        type: 'toggle',
        value: true,
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Admin notification preferences',
    icon: Bell,
    settings: [
      {
        key: 'notify_new_users',
        label: 'New User Alerts',
        description: 'Get notified when new users sign up',
        type: 'toggle',
        value: false,
      },
      {
        key: 'notify_errors',
        label: 'Error Alerts',
        description: 'Get notified of system errors',
        type: 'toggle',
        value: true,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Security and access settings',
    icon: Shield,
    settings: [
      {
        key: 'require_email_verification',
        label: 'Require Email Verification',
        description: 'Users must verify email before full access',
        type: 'toggle',
        value: true,
      },
      {
        key: 'session_timeout',
        label: 'Session Timeout',
        description: 'Auto logout after inactivity (hours)',
        type: 'number',
        value: 24,
      },
      {
        key: 'max_file_size',
        label: 'Max File Size (MB)',
        description: 'Maximum upload file size',
        type: 'number',
        value: 10,
      },
    ],
  },
];

export default function SettingsPage() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = (sectionId: string, key: string, value: boolean | number | string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          settings: section.settings.map((setting) => {
            if (setting.key !== key) return setting;
            return { ...setting, value };
          }),
        };
      })
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // In production, save to database
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSections(DEFAULT_SECTIONS);
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure platform settings"
        actions={
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {/* Settings Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              {/* Section Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {section.settings.map((setting) => (
                  <div
                    key={setting.key}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {setting.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {setting.description}
                      </p>
                    </div>

                    {/* Toggle */}
                    {setting.type === 'toggle' && (
                      <button
                        onClick={() =>
                          updateSetting(section.id, setting.key, !setting.value)
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          setting.value
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            setting.value ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    )}

                    {/* Number Input */}
                    {setting.type === 'number' && (
                      <input
                        type="number"
                        value={setting.value as number}
                        onChange={(e) =>
                          updateSetting(
                            section.id,
                            setting.key,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-24 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-right"
                      />
                    )}

                    {/* Select */}
                    {setting.type === 'select' && setting.options && (
                      <select
                        value={setting.value as string}
                        onChange={(e) =>
                          updateSetting(section.id, setting.key, e.target.value)
                        }
                        className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                      >
                        {setting.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/50 p-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          <strong>Note:</strong> Some settings require a server restart to take effect.
          Feature toggles update immediately for new sessions.
        </p>
      </div>
    </div>
  );
}
