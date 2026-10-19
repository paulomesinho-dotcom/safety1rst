import React from 'react';
import { ExternalLink, Download } from 'lucide-react';
import { Modal } from './Modal';
import { downloadFile } from '../lib/utils';

interface PDFViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName: string;
    fileType?: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ isOpen, onClose, fileUrl, fileName, fileType = 'pdf' }) => {
    // Determine type if not provided explicitly, fallback to check extension
    const isImage = fileType === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    const isPdf = fileType === 'pdf' || /\.pdf$/i.test(fileName);

    // URL Transformation Logic
    let displayUrl = fileUrl;

    // Google Drive Transformation
    // Handle various formats:
    // https://drive.google.com/file/d/ID/view
    // https://drive.google.com/open?id=ID
    // https://docs.google.com/file/d/ID/edit
    let gdriveId = null;
    if (fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com')) {
        const idMatch = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            gdriveId = idMatch[1];
        }
    }


    if (gdriveId) {
        if (isImage) {
            displayUrl = `https://drive.google.com/uc?export=view&id=${gdriveId}`;
        } else {
            // Force Preview Mode for everything else (PDFs, Docs, etc)
            displayUrl = `https://drive.google.com/file/d/${gdriveId}/preview`;
        }
    }

    // Dropbox Transformation
    // Standard: https://www.dropbox.com/s/xyz/file.pdf?dl=0
    // Embed/Image: change dl=0 to raw=1
    // Use DIRECT iframe for Dropox (works in Chrome/Edge/Firefox with native PDF viewer)
    let isDropbox = false;
    if (fileUrl.includes('dropbox.com')) {
        isDropbox = true;
        try {
            const urlObj = new URL(fileUrl);
            urlObj.searchParams.set('raw', '1');
            displayUrl = urlObj.toString();
        } catch (e) {
            console.log('Error parsing Dropbox URL', e);
        }
    }

    const openButton = (
        <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent mr-2"
        >
            <ExternalLink size={16} />
            <span className="hidden sm:inline">Open</span>
        </a>
    );

    // Check if it's a Drive Preview Link (HTML)
    const isDrivePreview = displayUrl.includes('drive.google.com') && displayUrl.includes('preview');
    // Dropbox Raw=1 is binary, so Object is fine IF the browser supports it. 
    // BUT, Dropbox sometimes redirects to a viewer if raw=1 is not respected or for certain types.
    // Ideally, for PDF, raw=1 serves the file.

    return (
        <Modal
            title={fileName}
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-5xl"
            fullScreen={false}
            headerAction={openButton}
        >
            <div className="w-full flex flex-col h-[85vh]"> {/* Increased height for better visibility */}
                <div className="flex-1 bg-gray-100 dark:bg-surface rounded-lg overflow-hidden border border-gray-200 dark:border-[#444746] relative flex items-center justify-center min-h-0">
                    {displayUrl ? (
                        <>
                            {isImage ? (
                                <img
                                    src={displayUrl}
                                    alt={fileName}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : isDrivePreview ? (
                                <iframe
                                    src={displayUrl}
                                    className="w-full h-full border-none"
                                    title={fileName}
                                    allow="autoplay"
                                />
                            ) : isDropbox ? (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                                        <ExternalLink size={48} className="text-brand" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Opção de Pré-visualização Limitada</h3>
                                    <p className="text-gray-500 max-w-md mb-6">
                                        O Dropbox não permite a pré-visualização direta neste visualizador.
                                        Por favor, abra o documento noutra janela para o visualizar.
                                    </p>
                                    <a
                                        href={displayUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium shadow-sm"
                                    >
                                        <ExternalLink size={18} />
                                        Abrir no Dropbox
                                    </a>
                                </div>
                            ) : isPdf ? (
                                <object
                                    data={displayUrl}
                                    type="application/pdf"
                                    className="w-full h-full"
                                    title={fileName}
                                >
                                    <div className="flex items-center justify-center h-full flex-col gap-2">
                                        <p className="text-gray-500">Preview not supported by browser.</p>
                                        <button onClick={() => downloadFile(displayUrl, fileName)} className="text-primary underline">Download PDF</button>
                                    </div>
                                </object>
                            ) : (
                                <div className="text-center p-8">
                                    <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
                                    <Download size={48} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-400">Please download to view.</p>
                                </div>
                            )}

                            {/* Warn if using expired Blob URL */}
                            {fileUrl.startsWith('blob:') && (
                                <div className="absolute top-2 left-2 right-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-2 rounded text-center z-10 opacity-75 hover:opacity-100 transition-opacity">
                                    Previewing legacy file. If it fails to load, please re-upload for permanent storage.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No document to display
                        </div>
                    )}
                </div>
            </div>
        </Modal >
    );
};
