'use client';

/**
 * Admin Knowledge Base Page
 *
 * Manage RAG knowledge for Bakame AI.
 * Features:
 * - Add/edit/delete knowledge documents
 * - Add/edit/delete Q&A pairs
 * - View processing status
 * - Category management
 */

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit,
  RefreshCw,
  FileText,
  MessageSquare,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Upload,
  Download,
  Filter,
  MoreVertical,
  Zap,
} from 'lucide-react';
import { PageHeader, StatCard } from '../_components';
import {
  getKnowledgeDocuments,
  getKnowledgeQA,
  getKnowledgeStats,
  getKnowledgeCategories,
  createKnowledgeDocument,
  createKnowledgeQA,
  deleteKnowledgeDocument,
  deleteKnowledgeQA,
  updateKnowledgeDocument,
  processKnowledgeDocument,
  type KnowledgeDocument,
  type KnowledgeQA,
} from '../_lib/actions';

// Predefined categories for Rwanda knowledge
const CATEGORIES = [
  { value: 'tax', label: 'Tax & RRA' },
  { value: 'business', label: 'Business & RDB' },
  { value: 'government', label: 'Government & Irembo' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'law', label: 'Law & Legal' },
  { value: 'general', label: 'General' },
];

type TabType = 'documents' | 'qa';

export default function KnowledgePage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    totalQA: 0,
    totalCategories: 0,
  });

  // Documents
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsTotalPages, setDocumentsTotalPages] = useState(1);

  // Q&A
  const [qa, setQA] = useState<KnowledgeQA[]>([]);
  const [qaPage, setQAPage] = useState(1);
  const [qaTotalPages, setQATotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddQA, setShowAddQA] = useState(false);
  const [editingDocument, setEditingDocument] = useState<KnowledgeDocument | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    } else {
      loadQA();
    }
  }, [activeTab, documentsPage, qaPage, searchQuery, categoryFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await getKnowledgeStats();
      setStats(statsData);
      await loadDocuments();
    } catch (err) {
      setError('Failed to load knowledge data');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const result = await getKnowledgeDocuments({
        page: documentsPage,
        pageSize: 10,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setDocuments(result.documents);
      setDocumentsTotalPages(result.totalPages);
    } catch (err) {
      setError('Failed to load documents');
    }
  };

  const loadQA = async () => {
    try {
      const result = await getKnowledgeQA({
        page: qaPage,
        pageSize: 10,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      });
      setQA(result.qa);
      setQATotalPages(result.totalPages);
    } catch (err) {
      setError('Failed to load Q&A');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteKnowledgeDocument(id);
      await loadDocuments();
      const statsData = await getKnowledgeStats();
      setStats(statsData);
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const handleDeleteQA = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Q&A?')) return;
    try {
      await deleteKnowledgeQA(id);
      await loadQA();
      const statsData = await getKnowledgeStats();
      setStats(statsData);
    } catch (err) {
      setError('Failed to delete Q&A');
    }
  };

  const handleProcessDocument = async (id: string) => {
    try {
      await processKnowledgeDocument(id);
      await loadDocuments();
    } catch (err) {
      setError('Failed to process document');
    }
  };

  const handleToggleActive = async (doc: KnowledgeDocument) => {
    try {
      await updateKnowledgeDocument(doc.id, { is_active: !doc.is_active });
      await loadDocuments();
    } catch (err) {
      setError('Failed to update document');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const icons = {
      ready: CheckCircle,
      processing: RefreshCw,
      pending: Clock,
      error: AlertCircle,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Knowledge Base" description="Manage RAG knowledge for Bakame AI" />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Manage RAG knowledge for Bakame AI"
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => activeTab === 'documents' ? setShowAddDocument(true) : setShowAddQA(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab === 'documents' ? 'Document' : 'Q&A'}
            </button>
          </div>
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
          title="Documents"
          value={stats.totalDocuments}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Chunks"
          value={stats.totalChunks}
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Q&A Pairs"
          value={stats.totalQA}
          icon={MessageSquare}
          color="purple"
        />
        <StatCard
          title="Categories"
          value={stats.totalCategories}
          icon={Filter}
          color="yellow"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'qa'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Q&A Pairs
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {activeTab === 'documents' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'documents' ? (
            <DocumentsTable
              documents={documents}
              onDelete={handleDeleteDocument}
              onProcess={handleProcessDocument}
              onToggleActive={handleToggleActive}
              onEdit={setEditingDocument}
              getStatusBadge={getStatusBadge}
            />
          ) : (
            <QATable qa={qa} onDelete={handleDeleteQA} />
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {activeTab === 'documents' ? documentsPage : qaPage} of{' '}
            {activeTab === 'documents' ? documentsTotalPages : qaTotalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                activeTab === 'documents'
                  ? setDocumentsPage((p) => Math.max(1, p - 1))
                  : setQAPage((p) => Math.max(1, p - 1))
              }
              disabled={(activeTab === 'documents' ? documentsPage : qaPage) === 1}
              className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                activeTab === 'documents'
                  ? setDocumentsPage((p) => Math.min(documentsTotalPages, p + 1))
                  : setQAPage((p) => Math.min(qaTotalPages, p + 1))
              }
              disabled={
                (activeTab === 'documents' ? documentsPage : qaPage) ===
                (activeTab === 'documents' ? documentsTotalPages : qaTotalPages)
              }
              className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddDocument && (
        <AddDocumentModal
          onClose={() => setShowAddDocument(false)}
          onSuccess={async () => {
            setShowAddDocument(false);
            await loadDocuments();
            const statsData = await getKnowledgeStats();
            setStats(statsData);
          }}
        />
      )}

      {/* Add Q&A Modal */}
      {showAddQA && (
        <AddQAModal
          onClose={() => setShowAddQA(false)}
          onSuccess={async () => {
            setShowAddQA(false);
            await loadQA();
            const statsData = await getKnowledgeStats();
            setStats(statsData);
          }}
        />
      )}

      {/* Edit Document Modal */}
      {editingDocument && (
        <EditDocumentModal
          document={editingDocument}
          onClose={() => setEditingDocument(null)}
          onSuccess={async () => {
            setEditingDocument(null);
            await loadDocuments();
          }}
        />
      )}
    </div>
  );
}

// Documents Table Component
function DocumentsTable({
  documents,
  onDelete,
  onProcess,
  onToggleActive,
  onEdit,
  getStatusBadge,
}: {
  documents: KnowledgeDocument[];
  onDelete: (id: string) => void;
  onProcess: (id: string) => void;
  onToggleActive: (doc: KnowledgeDocument) => void;
  onEdit: (doc: KnowledgeDocument) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No documents found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <th className="pb-3 font-medium">Title</th>
            <th className="pb-3 font-medium">Category</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Chunks</th>
            <th className="pb-3 font-medium">Active</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {documents.map((doc) => (
            <tr key={doc.id} className="text-sm">
              <td className="py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{doc.title}</p>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{doc.source || 'No source'}</p>
                </div>
              </td>
              <td className="py-3">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  {doc.category}
                </span>
              </td>
              <td className="py-3">{getStatusBadge(doc.status)}</td>
              <td className="py-3 text-gray-500">{doc.chunk_count || 0}</td>
              <td className="py-3">
                <button
                  onClick={() => onToggleActive(doc)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    doc.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      doc.is_active ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  {doc.status === 'pending' && (
                    <button
                      onClick={() => onProcess(doc.id)}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Process document"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(doc)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Q&A Table Component
function QATable({
  qa,
  onDelete,
}: {
  qa: KnowledgeQA[];
  onDelete: (id: string) => void;
}) {
  if (qa.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No Q&A pairs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {qa.map((item) => (
        <div
          key={item.id}
          className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                  {item.category}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                  {item.language}
                </span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white mb-2">Q: {item.question}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">A: {item.answer}</p>
              {item.source && (
                <p className="text-xs text-gray-500 mt-2">Source: {item.source}</p>
              )}
            </div>
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Add Document Modal
function AddDocumentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    language: 'en',
    source: '',
    priority: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    setSaving(true);
    try {
      await createKnowledgeDocument(formData);
      onSuccess();
    } catch (error) {
      alert('Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Add Knowledge Document</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source URL (optional)
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg h-64"
              required
              placeholder="Paste your knowledge content here..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Q&A Modal
function AddQAModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    language: 'en',
    source: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question || !formData.answer) return;

    setSaving(true);
    try {
      await createKnowledgeQA(formData);
      onSuccess();
    } catch (error) {
      alert('Failed to create Q&A');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 max-w-xl w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Add Q&A Pair</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              required
              placeholder="What is the VAT rate in Rwanda?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Answer *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg h-32"
              required
              placeholder="The standard VAT rate in Rwanda is 18%..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source (optional)
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              placeholder="RRA Website, Law Article, etc."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Q&A'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Document Modal
function EditDocumentModal({
  document,
  onClose,
  onSuccess,
}: {
  document: KnowledgeDocument;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: document.title,
    content: document.content,
    category: document.category,
    language: document.language,
    source: document.source || '',
    priority: document.priority,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateKnowledgeDocument(document.id, formData);
      onSuccess();
    } catch (error) {
      alert('Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Edit Document</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source URL
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg h-64"
            />
            <p className="text-xs text-gray-500 mt-1">
              Note: Editing content will reset the document status to &quot;pending&quot; for re-processing.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
