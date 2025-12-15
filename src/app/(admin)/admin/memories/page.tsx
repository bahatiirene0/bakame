'use client';

/**
 * Admin User Memories Page
 *
 * View and manage user memories across all users.
 * Features:
 * - View all user memories
 * - Filter by user, type, category
 * - Delete inappropriate memories
 * - View memory statistics
 */

import { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Trash2,
  RefreshCw,
  User,
  AlertCircle,
  X,
  Filter,
  Target,
  Heart,
  Lightbulb,
  Info,
} from 'lucide-react';
import { PageHeader, StatCard } from '../_components';
import {
  getUserMemories,
  getMemoryStats,
  deleteUserMemory,
} from '../_lib/actions';

const MEMORY_TYPES = [
  { value: 'fact', label: 'Facts', icon: Info, color: 'blue' },
  { value: 'preference', label: 'Preferences', icon: Heart, color: 'pink' },
  { value: 'goal', label: 'Goals', icon: Target, color: 'green' },
  { value: 'context', label: 'Context', icon: Lightbulb, color: 'yellow' },
];

interface Memory {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  category: string;
  confidence: number;
  strength: number;
  source: string;
  is_active: boolean;
  created_at: string;
  last_accessed: string | null;
  users?: { name: string | null; email: string | null };
}

export default function MemoriesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalMemories: 0,
    usersWithMemories: 0,
    byType: {} as Record<string, number>,
  });

  // Memories
  const [memories, setMemories] = useState<Memory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMemories();
  }, [page, typeFilter, userIdFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await getMemoryStats();
      setStats(statsData);
      await loadMemories();
    } catch (err) {
      setError('Failed to load memory data');
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async () => {
    try {
      const result = await getUserMemories({
        page,
        pageSize: 20,
        userId: userIdFilter || undefined,
        memoryType: typeFilter || undefined,
      });
      setMemories(result.memories as Memory[]);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError('Failed to load memories');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      await deleteUserMemory(id);
      await loadMemories();
      const statsData = await getMemoryStats();
      setStats(statsData);
    } catch (err) {
      setError('Failed to delete memory');
    }
  };

  const getTypeIcon = (type: string) => {
    const config = MEMORY_TYPES.find((t) => t.value === type);
    if (!config) return Info;
    return config.icon;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fact: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      preference: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      goal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      context: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Memories" description="View and manage user memory data" />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Memories"
        description="View and manage user memory data"
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Memories"
          value={stats.totalMemories}
          icon={Brain}
          color="purple"
        />
        <StatCard
          title="Users with Memories"
          value={stats.usersWithMemories}
          icon={User}
          color="blue"
        />
        <StatCard
          title="Facts"
          value={stats.byType.fact || 0}
          icon={Info}
          color="green"
        />
        <StatCard
          title="Preferences"
          value={stats.byType.preference || 0}
          icon={Heart}
          color="red"
        />
      </div>

      {/* Memory Type Distribution */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Memory Types Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MEMORY_TYPES.map((type) => {
            const count = stats.byType[type.value] || 0;
            const total = stats.totalMemories || 1;
            const percentage = Math.round((count / total) * 100);
            const Icon = type.icon;

            return (
              <div
                key={type.value}
                className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${getTypeColor(type.value)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {type.label}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {count}
                  </span>
                  <span className="text-sm text-gray-500">{percentage}%</span>
                </div>
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${type.color === 'blue' ? 'bg-blue-500' : type.color === 'pink' ? 'bg-pink-500' : type.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Memories List */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by user ID..."
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">All Types</option>
              {MEMORY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Memories */}
        <div className="p-4">
          {memories.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No memories found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memories.map((memory) => {
                const Icon = getTypeIcon(memory.memory_type);
                return (
                  <div
                    key={memory.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(memory.memory_type)}`}>
                            <Icon className="w-3 h-3" />
                            {memory.memory_type}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {memory.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            Confidence: {Math.round(memory.confidence * 100)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            Strength: {Math.round(memory.strength * 100)}%
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-white">{memory.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {memory.users?.name || memory.users?.email || memory.user_id.slice(0, 8)}
                          </span>
                          <span>Created: {formatDate(memory.created_at)}</span>
                          {memory.last_accessed && (
                            <span>Last used: {formatDate(memory.last_accessed)}</span>
                          )}
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            {memory.source}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              About User Memories
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Memories are automatically extracted from user conversations and help personalize
              Bakame&apos;s responses. Memory strength decays over time if not accessed, helping
              maintain relevance. You can delete inappropriate or sensitive memories from this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
