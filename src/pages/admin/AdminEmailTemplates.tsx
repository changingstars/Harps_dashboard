import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Mail, Check, AlertCircle, Save, Variable, Eye } from 'lucide-react';
// import ReactMarkdown from 'react-markdown'; // Removed unused import

interface EmailTemplate {
    slug: string;
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
    variables_hint: string[];
}

const AdminEmailTemplates: React.FC = () => {
    // const { session } = useAuth(); // Removed
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null); // Use a copy for editing
    const [originalTemplate, setOriginalTemplate] = useState<EmailTemplate | null>(null); // To detect changes ?
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching templates:', error);
            alert('Hiba történt a sablonok betöltésekor.');
        } else {
            setTemplates(data || []);
            // Select first by default if available
            if (data && data.length > 0 && !selectedTemplate) {
                handleSelectTemplate(data[0]);
            }
        }
        setLoading(false);
    };

    const handleSelectTemplate = (template: EmailTemplate) => {
        // Deep copy to break reference
        setOriginalTemplate(JSON.parse(JSON.stringify(template)));
        setSelectedTemplate(JSON.parse(JSON.stringify(template)));
        setPreviewMode(false);
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;
        setSaving(true);
        const { error } = await supabase
            .from('email_templates')
            .update({
                subject: selectedTemplate.subject,
                body: selectedTemplate.body,
                is_active: selectedTemplate.is_active
            })
            .eq('slug', selectedTemplate.slug);

        if (error) {
            console.error('Error saving template:', error);
            alert('Mentés sikertelen!');
        } else {
            // Update local list
            setTemplates(prev => prev.map(t => t.slug === selectedTemplate.slug ? selectedTemplate : t));
            setOriginalTemplate(JSON.parse(JSON.stringify(selectedTemplate)));
            alert('Sikeres mentés!');
        }
        setSaving(false);
    };

    if (loading && templates.length === 0) return <div className="p-8">Betöltés...</div>;

    return (
        <div className="p-6 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-serif text-harps-blue flex items-center gap-3">
                        <Mail className="h-8 w-8 text-harps-gold" />
                        Email Sablonok
                    </h1>
                    <p className="text-gray-600 mt-2">Itt szerkesztheted a rendszer által küldött automatikus üzeneteket.</p>
                </div>
            </div>

            <div className="flex gap-6 h-[calc(100vh-200px)]">
                {/* LIST COLUMN */}
                <div className="w-1/3 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Sablonok</h2>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {templates.map(tmpl => (
                            <button
                                key={tmpl.slug}
                                onClick={() => handleSelectTemplate(tmpl)}
                                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedTemplate?.slug === tmpl.slug ? 'bg-blue-50 border-l-4 border-l-harps-blue' : ''
                                    }`}
                            >
                                <div>
                                    <div className={`font-medium ${selectedTemplate?.slug === tmpl.slug ? 'text-harps-blue' : 'text-gray-800'}`}>
                                        {tmpl.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                                        {tmpl.subject}
                                    </div>
                                </div>
                                <div className={`h-2 w-2 rounded-full ${tmpl.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* EDITOR COLUMN */}
                <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
                    {selectedTemplate ? (
                        <>
                            {/* HEADER */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                            slug: {selectedTemplate.slug}
                                        </span>
                                    </div>

                                    {/* VARIABLES HINT */}
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold mb-2">
                                            <AlertCircle size={16} />
                                            Használható változók:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(() => {
                                                const hints = selectedTemplate.variables_hint;
                                                const variables = Array.isArray(hints)
                                                    ? hints
                                                    : (hints && typeof hints === 'object')
                                                        ? Object.keys(hints)
                                                        : [];

                                                return variables.map(v => (
                                                    <span key={v} className="bg-white text-blue-600 px-2 py-1 rounded border border-blue-200 text-xs font-mono">
                                                        {"{{"}{v}{"}}"}
                                                    </span>
                                                ));
                                            })()}
                                        </div>
                                        <p className="text-xs text-blue-400 mt-2">Másold be ezeket a szövegbe, és a rendszer automatikusan behelyettesíti.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setPreviewMode(!previewMode)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                                    >
                                        <Eye size={16} />
                                        {previewMode ? 'Szerkesztés' : 'Előnézet'}
                                    </button>

                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Mentés...' : (
                                            <>
                                                <Save size={18} />
                                                Mentés
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* BODY */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* SUBJECT INPUT */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tárgy</label>
                                    <input
                                        type="text"
                                        value={selectedTemplate.subject || ''}
                                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harps-gold focus:border-transparent outline-none"
                                    />
                                </div>

                                {/* ACTIVE TOGGLE */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <div className="font-medium text-gray-900">Kiküldés engedélyezése</div>
                                        <div className="text-xs text-gray-500">Ha aktív, a rendszer automatikusan kiküldi ezt az emailt.</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={selectedTemplate.is_active}
                                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, is_active: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {/* CONTENT EDITOR */}
                                <div className="flex-1 min-h-[400px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Üzenet tartalma (HTML)</label>
                                        {/* Simple toolbar could go here (Bold, Italic, Header) */}
                                    </div>

                                    {previewMode ? (
                                        <div className="border border-gray-300 rounded-lg p-6 min-h-[400px] prose max-w-none bg-white">
                                            <h1>{selectedTemplate.subject}</h1>
                                            <hr className="my-4" />
                                            <div dangerouslySetInnerHTML={{ __html: selectedTemplate.body || '' }} />
                                        </div>
                                    ) : (
                                        <textarea
                                            value={selectedTemplate.body || ''}
                                            onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                                            className="w-full h-[400px] p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-harps-gold focus:border-transparent outline-none resize-none bg-gray-50"
                                            placeholder="<html>...</html>"
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <Mail size={48} className="mb-4 opacity-20" />
                            <p>Válassz egy sablont a bal oldali listából</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminEmailTemplates;
